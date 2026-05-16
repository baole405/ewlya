import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  Collection,
  Message,
  TextChannel,
  SnowflakeUtil,
} from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('scan-hof')
  .setDescription('Scan HOF channel for unverified image submissions from Official members (Admin Only)')
  .addIntegerOption(option =>
    option
      .setName('month')
      .setDescription('Month to scan (1–12, default: current month)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(12)
  )
  .addIntegerOption(option =>
    option
      .setName('year')
      .setDescription('Year to scan (e.g. 2026, default: current year)')
      .setRequired(false)
      .setMinValue(2020)
      .setMaxValue(2100)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', flags: 64 });
  }

  await interaction.deferReply({ flags: 64 });

  try {
    const hofChannelId = process.env['HOF_CHANNEL_ID'];
    if (!hofChannelId) {
      return interaction.editReply('❌ `HOF_CHANNEL_ID` is not configured in environment variables.');
    }

    const channel = await interaction.client.channels.fetch(hofChannelId);
    if (!channel || !channel.isTextBased()) {
      return interaction.editReply('❌ Cannot access HOF channel.');
    }

    const textChannel = channel as TextChannel;

    // Determine scan date range (default: current month)
    const now = new Date();
    const targetMonth = (interaction.options.getInteger('month') ?? now.getMonth() + 1) - 1; // 0-indexed
    const targetYear = interaction.options.getInteger('year') ?? now.getFullYear();

    const monthStart = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999); // last day of month

    // Generate snowflake IDs for date boundaries (for Discord's "after" param)
    const afterSnowflake = SnowflakeUtil.generate({ timestamp: monthStart.getTime() - 1 });
    const beforeSnowflake = SnowflakeUtil.generate({ timestamp: monthEnd.getTime() + 1 });

    const monthLabel = monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Load Official members into a Map for O(1) lookup
    const officialMembers = await prisma.member.findMany({
      where: { status: 'OFFICIAL', discordId: { not: null } },
      select: { discordId: true, nickname: true }
    });
    const officialDiscordIds = new Map(
      officialMembers
        .filter(m => m.discordId)
        .map(m => [m.discordId!, m.nickname])
    );

    const botId = interaction.client.user?.id;

    // Fetch messages within the month range in batches
    let allMessages: Collection<string, Message> = new Collection();
    let lastId: string | undefined = beforeSnowflake.toString();
    let totalFetched = 0;
    let reachedStart = false;

    while (!reachedStart) {
      const options: { limit: number; before?: string } = { limit: 100 };
      if (lastId) options.before = lastId;

      const batch = await textChannel.messages.fetch(options);
      if (batch.size === 0) break;

      // Filter: only keep messages within the target month
      for (const [id, msg] of batch) {
        if (msg.createdAt < monthStart) {
          reachedStart = true;
          break;
        }
        if (msg.createdAt <= monthEnd) {
          allMessages.set(id, msg);
        }
      }

      lastId = batch.last()?.id;
      totalFetched += batch.size;

      if (batch.size < 100) break; // No more messages in channel
    }

    const unverified: { nickname: string; link: string; imageCount: number; timestamp: Date }[] = [];

    for (const [, msg] of allMessages) {
      // Only process Official members
      if (!officialDiscordIds.has(msg.author.id)) continue;

      // Must have at least one image attachment
      const imageAttachments = msg.attachments.filter(att =>
        att.contentType?.startsWith('image/')
      );
      if (imageAttachments.size === 0) continue;

      // Fast path: if there's no ✅ reaction cache at all, skip fetch entirely → unverified
      const tickReaction = msg.reactions.cache.get('✅');
      if (!tickReaction) {
        const nickname = officialDiscordIds.get(msg.author.id) ?? msg.author.username;
        const link = `https://discord.com/channels/${msg.guild?.id}/${msg.channelId}/${msg.id}`;
        unverified.push({ nickname, link, imageCount: imageAttachments.size, timestamp: msg.createdAt });
        continue;
      }

      // If ✅ exists but need to confirm if BOT reacted (not just anyone)
      if (botId) {
        const users = await tickReaction.users.fetch();
        if (!users.has(botId)) {
          const nickname = officialDiscordIds.get(msg.author.id) ?? msg.author.username;
          const link = `https://discord.com/channels/${msg.guild?.id}/${msg.channelId}/${msg.id}`;
          unverified.push({ nickname, link, imageCount: imageAttachments.size, timestamp: msg.createdAt });
        }
      }
    }

    // Sort by oldest first so it's easier to process in order
    unverified.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const scannedCount = allMessages.size;

    if (unverified.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('✅ All Clear!')
        .setColor(0x22c55e)
        .setDescription(
          `Scanned **${scannedCount}** messages in <#${hofChannelId}> for **${monthLabel}**.\nAll image submissions from Official members have been verified by the bot! 🎉`
        )
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    // Build result embed(s) — chunk at 20 fields each
    const CHUNK_SIZE = 20;
    const chunks: typeof unverified[] = [];
    for (let i = 0; i < unverified.length; i += CHUNK_SIZE) {
      chunks.push(unverified.slice(i, i + CHUNK_SIZE));
    }

    const embeds = chunks.map((chunk, idx) => {
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTimestamp();

      if (idx === 0) {
        embed
          .setTitle(`🔍 Unverified HOF Submissions — ${monthLabel}`)
          .setDescription(
            `Scanned **${scannedCount}** messages in <#${hofChannelId}>.\nFound **${unverified.length}** unverified image submission(s) from Official members — no ✅ bot reaction yet.\n\nClick each link to navigate directly to the submission:`
          );
      } else {
        embed.setTitle(`🔍 Unverified (continued ${idx + 1}/${chunks.length})`);
      }

      for (const item of chunk) {
        const dateStr = item.timestamp.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        embed.addFields({
          name: `• ${item.nickname} — ${dateStr} (${item.imageCount} img)`,
          value: item.link,
          inline: false
        });
      }

      return embed;
    });

    return interaction.editReply({ embeds });

  } catch (error) {
    console.error('[scan-hof] Error:', error);
    return interaction.editReply('❌ An error occurred while scanning the HOF channel.');
  }
}
