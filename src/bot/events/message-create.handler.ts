import { prisma } from '../../database/prisma';
import { EmbedBuilder, Message } from 'discord.js';

export async function handleMessageCreate(message: Message) {
  // Only handle commands starting with !
  if (!message.content.startsWith('!')) return;
  if (message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (command === 'check' || command === 'progression') {
    // 1. Get latest active check
    const now = new Date();
    const activeCheck = await prisma.progressionCheck.findFirst({
      where: {
        deletedAt: null,
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        memberStatuses: {
          where: { isCompleted: false },
          include: { member: true },
        },
      },
    });

    if (!activeCheck) {
      return message.reply('There are currently no active progression checks.');
    }

    // 2. Filter OFFICIAL members only
    const incompleteOfficial = activeCheck.memberStatuses.filter(
      (s) => s.member.status === 'OFFICIAL',
    );

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(`📊 Progression Report: ${activeCheck.title}`)
      .setDescription(activeCheck.description || 'No description.')
      .addFields(
        {
          name: '📅 Start',
          value: activeCheck.startDate.toLocaleDateString('en-US'),
          inline: true,
        },
        {
          name: '⚑ Deadline',
          value: activeCheck.endDate ? activeCheck.endDate.toLocaleDateString('en-US') : '∞',
          inline: true,
        },
        {
          name: '👥 Incomplete Official',
          value:
            incompleteOfficial.length > 0
              ? `${incompleteOfficial.length} members`
              : 'All completed! 🎉',
        },
      )
      .setTimestamp();

    if (incompleteOfficial.length > 0) {
      const list = incompleteOfficial
        .map((s) => `- **${s.member.nickname}** (${s.member.ign})`)
        .join('\n');
      embed.addFields({ name: '🔴 Red Flag List:', value: list.slice(0, 1024) });
    }

    return message.reply({ embeds: [embed] });
  }

  return;
}

