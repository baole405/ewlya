import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  Collection,
  Message,
  ChannelType,
} from 'discord.js';
import { prisma } from '../../database/prisma';
import { AISummaryService } from '../services/ai-summary.service';
import { LoggerService } from '../services/logger.service';

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

export const data = new SlashCommandBuilder()
  .setName('summarize')
  .setDescription('🤖 Use AI to summarize messages in a channel (Official Members only)')
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Channel to summarize (default: current channel)')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false),
  )
  .addIntegerOption(option =>
    option
      .setName('limit')
      .setDescription(`Number of recent messages to summarize (default: ${DEFAULT_LIMIT}, max: ${MAX_LIMIT})`)
      .setMinValue(10)
      .setMaxValue(MAX_LIMIT)
      .setRequired(false),
  )
  .addIntegerOption(option =>
    option
      .setName('hours')
      .setDescription('Scan messages in the last N hours (e.g., 24 = 1 day, 168 = 1 week)')
      .setMinValue(1)
      .setMaxValue(720) // max 30 days
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // ── Permission check: Official Members only ──────────────────────────────
  const member = await prisma.member.findUnique({
    where: { discordId: interaction.user.id },
    select: { status: true, nickname: true },
  });

  if (!member || member.status !== 'OFFICIAL') {
    return interaction.reply({
      content: '❌ This feature is restricted to **Official Members** only.',
      flags: 64, // ephemeral
    });
  }

  // ── Channel check: Chỉ cho phép dùng ở kênh test hiện tại ────────────────
  const testChannelId = process.env['TEST_CHANNEL_ID'];
  if (testChannelId && interaction.channelId !== testChannelId) {
    return interaction.reply({
      content: `❌ The \`/summarize\` command is currently in testing and can only be used in <#${testChannelId}>.`,
      flags: 64, // ephemeral
    });
  }

  // ── Defer reply ngay lập tức để tránh 3s timeout ─────────────────────────
  await interaction.deferReply();

  try {
    // ── Resolve target channel ───────────────────────────────────────────────
    const targetChannel =
      (interaction.options.getChannel('channel') as TextChannel | null) ??
      (interaction.channel as TextChannel);

    if (!targetChannel || !targetChannel.isTextBased()) {
      return interaction.editReply('❌ Channel không hợp lệ.');
    }

    const limitOption = interaction.options.getInteger('limit');
    const hoursOption = interaction.options.getInteger('hours');

    // Nếu không có option nào → dùng limit mặc định
    const useHoursMode = hoursOption != null;
    const useLimit = limitOption ?? DEFAULT_LIMIT;

    // ── Fetch messages ───────────────────────────────────────────────────────
    await LoggerService.logAction(interaction.client, '🤖 AI Summary Started', `Scanning messages in <#${targetChannel.id}>...`);
    let messages: Collection<string, Message>;

    if (useHoursMode) {
      messages = await fetchMessagesByHours(targetChannel, hoursOption!);
    } else {
      messages = await fetchMessagesByLimit(targetChannel, useLimit);
    }

    if (messages.size === 0) {
      return interaction.editReply('⚠️ No messages found in the specified time frame or limit.');
    }
    
    await LoggerService.logAction(interaction.client, '🤖 AI Summary Fetching', `Fetched ${messages.size} messages. Calling Gemini API...`);

    // ── Truncate nếu quá dài (Gemini context limit safety) ──────────────────
    const HARD_CAP = 600;
    let processedMessages = messages;
    if (messages.size > HARD_CAP) {
      // Lấy HARD_CAP tin gần nhất
      const entries = [...messages.entries()].slice(-HARD_CAP);
      processedMessages = new Collection(entries);
    }

    // ── Call AI ──────────────────────────────────────────────────────────────
    const summaryResult = await AISummaryService.summarize(processedMessages, {
      channelId: targetChannel.id,
      channelName: targetChannel.name,
      guildId: interaction.guildId ?? undefined,
      requestedBy: interaction.user.id,
      requesterTag: interaction.user.username,
      hoursScanned: useHoursMode ? hoursOption! : undefined,
      limitUsed: useHoursMode ? undefined : useLimit,
    });
    
    await LoggerService.logAction(
      interaction.client, 
      '✅ AI Summary Success', 
      `Successfully summarized ${messages.size} messages in <#${targetChannel.id}>`,
      0x22c55e, // Green
      [
        { name: 'Processing Time', value: `${(summaryResult.durationMs / 1000).toFixed(1)}s`, inline: true },
        { name: 'Tokens Used', value: `${summaryResult.tokens}`, inline: true }
      ]
    );

    // ── Build result embed ───────────────────────────────────────────────────
    const scopeLabel = useHoursMode
      ? `Last ${hoursOption} hour(s)`
      : `Last ${useLimit} messages`;

    const embed = new EmbedBuilder()
      .setTitle(`🤖 AI Summary — <#${targetChannel.id}>`)
      .setColor(0x6366f1) // indigo
      .setDescription(summaryResult.summary)
      .addFields(
        {
          name: '📊 Statistics',
          value: [
            `• **Scope:** ${scopeLabel}`,
            `• **Scanned Messages:** ${summaryResult.messageCount.toLocaleString()}`,
            `• **Tokens Used:** ${summaryResult.tokens.toLocaleString()}`,
            `• **Processing Time:** ${(summaryResult.durationMs / 1000).toFixed(1)}s`,
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({
        text: `Summarized by ${summaryResult.model} • Requested by ${member.nickname ?? interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Nếu summary quá dài (>4096 chars) → trim và cảnh báo
    if (summaryResult.summary.length > 4096) {
      embed.setDescription(summaryResult.summary.slice(0, 4090) + '…');
    }

    return interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    console.error('[/summarize] Error:', error);

    // Friendly error message
    const errStr = error?.message?.toLowerCase() || '';
    let errMsg = '❌ An error occurred while calling the AI. Please try again later.';
    
    if (errStr.includes('gemini_api_key')) {
      errMsg = '❌ `GEMINI_API_KEY` is not configured on the server. Please contact an administrator!';
    } else if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted')) {
      errMsg = 'Liza is sleeping right now, call me back tomorrow 💤';
    } else if (errStr.includes('503') || errStr.includes('unavailable') || errStr.includes('high demand')) {
      errMsg = 'Liza is feeling a bit dizzy from all the messages right now 😵‍💫 Please ask me again in a minute!';
    }

    return interaction.editReply(errMsg);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch up to `limit` messages from a text channel.
 */
async function fetchMessagesByLimit(
  channel: TextChannel,
  limit: number,
): Promise<Collection<string, Message>> {
  const result: Collection<string, Message> = new Collection();
  let lastId: string | undefined;
  let remaining = limit;

  while (remaining > 0) {
    const batchSize = Math.min(remaining, 100);
    const options: { limit: number; before?: string } = { limit: batchSize };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;

    for (const [id, msg] of batch) {
      if (!msg.author.bot) result.set(id, msg);
    }

    lastId = batch.last()?.id;
    remaining -= batch.size;

    if (batch.size < batchSize) break;
  }

  return result;
}

/**
 * Fetch all messages within the last `hours` hours from a text channel.
 */
async function fetchMessagesByHours(
  channel: TextChannel,
  hours: number,
): Promise<Collection<string, Message>> {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const result: Collection<string, Message> = new Collection();
  let lastId: string | undefined;

  while (true) {
    const options: { limit: number; before?: string } = { limit: 100 };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;

    let reachedCutoff = false;
    for (const [id, msg] of batch) {
      if (msg.createdTimestamp < cutoff) {
        reachedCutoff = true;
        break;
      }
      if (!msg.author.bot) result.set(id, msg);
    }

    if (reachedCutoff) break;
    lastId = batch.last()?.id;
    if (batch.size < 100) break;
  }

  return result;
}
