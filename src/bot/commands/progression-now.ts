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
      where: { deletedAt: null, status: 'ACTIVE' },
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

    const allMembers = await prisma.member.findMany({
      where: { status: 'OFFICIAL' }
    });
    const existingStatusMap = new Map(activeCheck.memberStatuses.map(s => [s.memberId, s]));

    const completed: any[] = [];
    const notCompleted: any[] = [];
    const pending: any[] = [];

    for (const m of allMembers) {
      const s = existingStatusMap.get(m.id);
      if (!s) {
        pending.push({ member: m, note: null });
      } else if (s.isCompleted) {
        completed.push(s);
      } else if (s.note !== null) {
        notCompleted.push(s);
      } else {
        pending.push(s);
      }
    }

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

    const formatMemberLine = (s: any) => {
      if (s.note && !s.note.startsWith('Verified by') && !s.note.includes('via reaction')) {
        return `• ${s.member.nickname} (${s.note})`;
      }
      return `• ${s.member.nickname}`;
    };

    const embed = new EmbedBuilder()
      .setTitle(`${statusEmoji[activeCheck.status] || '📊'} Status: ${activeCheck.title}`)
      .setDescription(`Deadline: **${formatDate(activeCheck.endDate!)}** (<t:${Math.floor(activeCheck.endDate!.getTime() / 1000)}:F>)`)
      .setColor(0x38bdf8)
      .addFields(
        { 
          name: `✅ Completed (${completed.length})`, 
          value: completed.length > 0 ? completed.map(formatMemberLine).join('\n') : 'None yet',
          inline: true 
        },
        { 
          name: `❌ Not Complete (${notCompleted.length})`, 
          value: notCompleted.length > 0 ? notCompleted.map(formatMemberLine).join('\n') : 'None',
          inline: true 
        },
        { 
          name: `⏳ Pending (${pending.length})`, 
          value: pending.length > 0 ? pending.map(formatMemberLine).join('\n') : 'None',
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
