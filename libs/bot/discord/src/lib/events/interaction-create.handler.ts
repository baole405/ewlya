import { prisma } from '@ds/db';
import {
  ActionRowBuilder,
  EmbedBuilder,
  Interaction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { CategoryKey, getOptionById, POINT_CONFIG } from '../services/point-calculator.service';

export async function handleInteractionCreate(interaction: Interaction) {
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
    const selectedOption = getOptionById(categoryKey, interaction.values[0]);
    const category = POINT_CONFIG[categoryKey];

    if (!selectedOption) return;

    const channel = interaction.channel;
    if (!channel) return;

    try {
      const messageRef = interaction.message.reference;
      if (!messageRef || !messageRef.messageId) {
        await interaction.reply({
          content: '❌ Cannot find original message reference.',
          ephemeral: true,
        });
        return;
      }

      const repliedMessage = await channel.messages.fetch(messageRef.messageId);
      const targetUser = repliedMessage.author;

      // 1. Upsert Member
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

      // 2. Ensure Season exists
      let season = await prisma.season.findFirst({ where: { isActive: true } });
      if (!season) {
        const defaultName = 'Season 1';
        season = await prisma.season.findUnique({ where: { name: defaultName } });
        if (!season) {
          season = await prisma.season.create({
            data: { name: defaultName, startDate: new Date(), isActive: true },
          });
        } else {
          season = await prisma.season.update({
            where: { id: season.id },
            data: { isActive: true },
          });
        }
      }

      // 3. Log Submission
      await prisma.submission.create({
        data: {
          memberId: member.id,
          mission: category.label,
          rank: 0,
          points: selectedOption.points,
          seasonId: season.id,
          verifiedBy: interaction.user.id,
        },
      });

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
