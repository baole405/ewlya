import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('complete-check')
  .setDescription('Complete the active progression check and mark all pending members as Not Complete (Kills: 0)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const check = await prisma.progressionCheck.findFirst({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });

    if (!check) {
      return interaction.editReply('❌ No active progression check found to complete.');
    }

    // Directly update all pending records of THIS active check (where isCompleted = false and note = null) to "Kills: 0"
    const updateResult = await prisma.memberProgressionStatus.updateMany({
      where: {
        progressionCheckId: check.id,
        isCompleted: false,
        note: null
      },
      data: {
        note: 'Kills: 0'
      }
    });

    // Complete the check
    await prisma.progressionCheck.update({
      where: { id: check.id },
      data: { status: 'COMPLETED' }
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ Progression Check Completed')
      .setColor(0x22c55e)
      .setDescription(`The progression check **${check.title}** has been successfully closed and completed.`)
      .addFields(
        { name: 'Pending Members Closed', value: `**${updateResult.count}** members moved to **Not Complete (Kills: 0)**` },
        { name: 'Status Update', value: '`🟢 ACTIVE` ➔ `✅ COMPLETED`' }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to complete the progression check.');
  }
}
