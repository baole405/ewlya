import { prisma } from '../../database/prisma';
import {
  ActionRowBuilder,
  EmbedBuilder,
  Events,
  Interaction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { CategoryKey, getOptionById, POINT_CONFIG } from '../services/point-calculator.service';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  // Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    const client = interaction.client as any;
    const command = client.commands?.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
    return;
  }

  if (!interaction.isStringSelectMenu()) return;

  // STEP 1: Category Selection
  if (interaction.customId === 'hof_category') {
    const categoryKey = interaction.values[0] as CategoryKey;
    const category = POINT_CONFIG[categoryKey];

    const subSelect = new StringSelectMenuBuilder()
      .setCustomId(`hof_finalize_${categoryKey}`)
      .setPlaceholder('Select Result')
      .addOptions(
        category.options.map((opt) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(opt.label)
            .setValue(opt.id)
            .setDescription(`${opt.points} points`),
        ),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(subSelect);

      await interaction.update({
      content: `Category selected: **${category.label}**. Now choose the specific result:`,
      embeds: [],
      components: [row],
    });
  }

  // STEP 2: Finalize Selection
  if (interaction.customId.startsWith('hof_finalize_')) {
    const categoryKey = interaction.customId.split('_').pop() as CategoryKey;
    const optionId = interaction.values[0];
    const category = POINT_CONFIG[categoryKey];
    const selectedOption = getOptionById(categoryKey, optionId);

    if (!selectedOption) return;

    const channel = interaction.channel;
    if (!channel) return;

    try {
      const messageRef = interaction.message.reference;
      if (!messageRef || !messageRef.messageId) {
        console.error('❌ Interaction message has no reference/messageId');
        await interaction.reply({
          content: '❌ Cannot find original message reference.',
          ephemeral: true,
        });
        return;
      }

      const repliedMessage = await channel.messages.fetch(messageRef.messageId);
      const targetUser = repliedMessage.author;

      console.log(
        `💾 Attempting to save: User=${targetUser.username}, Category=${category.label}, Points=${selectedOption.points}`,
      );

      // 1. Update Member in DB
      const member = await prisma.member.upsert({
        where: { discordId: targetUser.id },
        update: {
          points: { increment: selectedOption.points },
          nickname: targetUser.username,
          avatarUrl: targetUser.displayAvatarURL(),
        },
        create: {
          discordId: targetUser.id,
          nickname: targetUser.username,
          ign: targetUser.username,
          points: selectedOption.points,
          avatarUrl: targetUser.displayAvatarURL(),
        },
      });
      console.log(`✅ Member updated: ${member.nickname} (Total: ${member.points})`);

      // 2. Ensure Season exists
      let season = await prisma.season.findFirst({ where: { isActive: true } });
      if (!season) {
        console.log('📅 No active season found, checking for default...');
        const defaultName = 'Season 1';
        season = await prisma.season.findUnique({ where: { name: defaultName } });

        if (!season) {
          console.log('✨ Creating new Season 1');
          season = await prisma.season.create({
            data: { name: defaultName, startDate: new Date(), isActive: true },
          });
        } else {
          console.log('🔄 Activating existing Season 1');
          season = await prisma.season.update({
            where: { id: season.id },
            data: { isActive: true },
          });
        }
      }
      console.log(`📅 Using Season: ${season.name}`);

      // 3. Log Submission
      const submission = await prisma.submission.create({
        data: {
          memberId: member.id,
          mission: category.label,
          rank: 0,
          points: selectedOption.points,
          seasonId: season.id,
          verifiedBy: interaction.user.id,
        },
      });
      console.log(`📝 Submission logged: ID=${submission.id}`);

      const successEmbed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('✅ Contribution Saved!')
        .setDescription(
          `Recipient: **${targetUser.username}**\nCategory: **${category.label}**\nType: **${selectedOption.label}**\nPoints: **+${selectedOption.points}**\n\n**New Total: ${member.points}**`,
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      await interaction.update({ content: null, embeds: [successEmbed], components: [] });
    } catch (err) {
      console.error('❌ Final Save Error:', err);
      // If we already updated the interaction in Step 1, we might need to use followUp or editReply
      // But Step 2 uses interaction.update at the end, if it fails before that, we should reply
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: `❌ Database Error: ${err instanceof Error ? err.message : String(err)}`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `❌ Database Error: ${err instanceof Error ? err.message : String(err)}`,
            ephemeral: true,
          });
        }
      } catch (replyErr) {
        console.error('Could not send error reply:', replyErr);
      }
    }
  }
}

