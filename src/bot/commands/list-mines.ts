import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('list-mines')
  .setDescription('List all active Mines progression checks (Admin Only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const checks = await (prisma.progressionCheck as any).findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { memberStatuses: true }
        },
        memberStatuses: {
          where: { isCompleted: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }) as any[];

    if (checks.length === 0) {
      return interaction.editReply('📭 No active Mines checks found.');
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Active Mines Checks')
      .setColor(0x38bdf8)
      .setTimestamp();

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

    checks.forEach((c) => {
      const completed = c.memberStatuses.length;
      const total = c._count.memberStatuses;
      const status = (c as any).status;
      const statusText = status && status !== 'ACTIVE' ? ` [${status}]` : '';
      
      embed.addFields({
        name: `${statusEmoji[status] || ''} ${c.title}${statusText}`,
        value: `ID: \`${c.id}\`\nEnds: **${c.endDate ? formatDate(c.endDate) : 'N/A'}** (<t:${Math.floor(c.endDate!.getTime() / 1000)}:R>)\nDone: **${completed}/${total}** members`,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to list checks.');
  }
}
