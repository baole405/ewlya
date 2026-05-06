import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('progression-now')
  .setDescription('View detailed status of the current progression (Admin Only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const activeCheck = await prisma.progressionCheck.findFirst({
      where: { deletedAt: null },
      include: {
        memberStatuses: {
          include: { member: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeCheck) {
      return interaction.editReply('📭 No active progression check found.');
    }

    const completed = activeCheck.memberStatuses.filter(s => s.isCompleted);
    const pending = activeCheck.memberStatuses.filter(s => !s.isCompleted);

    const statusEmoji: Record<string, string> = {
      'ACTIVE': '🟢',
      'POSTPONED': '🟠',
      'CLOSED': '🔴'
    };

    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      return `${day}/${month}`;
    };

    const embed = new EmbedBuilder()
      .setTitle(`${statusEmoji[activeCheck.status] || '📊'} Status: ${activeCheck.title}`)
      .setDescription(`Deadline: **${formatDate(activeCheck.endDate!)}** (<t:${Math.floor(activeCheck.endDate!.getTime() / 1000)}:F>)`)
      .setColor(0x38bdf8)
      .addFields(
        { 
          name: `✅ Completed (${completed.length})`, 
          value: completed.length > 0 ? completed.map(s => `• ${s.member.nickname}`).join('\n') : 'None yet',
          inline: true 
        },
        { 
          name: `⏳ Pending (${pending.length})`, 
          value: pending.length > 0 ? pending.map(s => `• ${s.member.nickname}`).join('\n') : 'Everyone is done!',
          inline: true 
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to fetch progression status.');
  }
}
