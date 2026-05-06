import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('mines-checks-status')
  .setDescription('View all Mines checks categorized by status (Admin Only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const checks = await prisma.progressionCheck.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { memberStatuses: true } },
        memberStatuses: { where: { isCompleted: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (checks.length === 0) return interaction.editReply('📭 No checks found.');

    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      return `${day}/${month}`;
    };

    const embed = new EmbedBuilder()
      .setTitle('📊 Mines System Overview')
      .setColor(0x38bdf8)
      .setTimestamp();

    const groups = {
      'ACTIVE': { emoji: '🟢', list: [] as any[] },
      'POSTPONED': { emoji: '🟠', list: [] as any[] },
      'COMPLETED': { emoji: '✅', list: [] as any[] }
    };

    checks.forEach(c => {
      const status = (c.status || 'ACTIVE') as keyof typeof groups;
      if (groups[status]) {
        groups[status].list.push(c);
      }
    });

    for (const [key, group] of Object.entries(groups)) {
      if (group.list.length > 0) {
        const text = group.list.map(c => {
          const done = c.memberStatuses.length;
          const total = c._count.memberStatuses;
          return `• **${c.title}** (\`${c.id}\`)\n  └ End: ${c.endDate ? formatDate(c.endDate) : 'N/A'} | Done: **${done}/${total}**`;
        }).join('\n\n');

        embed.addFields({ name: `${group.emoji} ${key}`, value: text || 'None', inline: false });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to fetch status overview.');
  }
}
