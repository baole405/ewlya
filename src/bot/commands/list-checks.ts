import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, AutocompleteInteraction } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('list-checks')
  .setDescription('List all progression checks or view details of a specific check (Admin Only)')
  .addStringOption(option => 
    option.setName('id')
      .setDescription('Select a check to view its detailed progression table')
      .setRequired(false)
      .setAutocomplete(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedOption = interaction.options.getFocused(true);
  
  if (focusedOption.name === 'id') {
    const checks = await prisma.progressionCheck.findMany({
      where: {
        deletedAt: null,
        title: { contains: focusedOption.value, mode: 'insensitive' }
      },
      orderBy: { createdAt: 'desc' },
      take: 25
    });

    const statusEmoji: Record<string, string> = {
      'ACTIVE': '🟢',
      'POSTPONED': '🟠',
      'COMPLETED': '✅',
      'CLOSED': '✅'
    };

    await interaction.respond(
      checks.map(c => {
        const emoji = statusEmoji[c.status] || '❓';
        const name = `${emoji} ${c.title} (${c.status})`;
        const displayName = name.length > 100 ? name.slice(0, 97) + '...' : name;
        return { name: displayName, value: c.id };
      })
    );
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  const id = interaction.options.getString('id');
  await interaction.deferReply({ ephemeral: true });

  try {
    const statusEmoji: Record<string, string> = {
      'ACTIVE': '🟢',
      'POSTPONED': '🟠',
      'COMPLETED': '✅',
      'CLOSED': '✅'
    };

    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      return `${day}/${month}`;
    };

    if (id) {
      // Fetch the specific check with its member statuses
      const check = await prisma.progressionCheck.findFirst({
        where: { id, deletedAt: null },
        include: {
          memberStatuses: {
            include: { member: true }
          }
        }
      });

      if (!check) {
        return interaction.editReply('❌ Progression check not found.');
      }

      const allMembers = await prisma.member.findMany({
        where: { status: 'OFFICIAL' }
      });
      const existingStatusMap = new Map(check.memberStatuses.map(s => [s.memberId, s]));

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

      const formatMemberLine = (s: any) => {
        let note = s.note;
        if (note) {
          if (!check.title.toLowerCase().includes('raid') && note === 'Kills: 0') {
            note = null;
          } else if (!check.title.toLowerCase().includes('raid') && note.startsWith('Kills: ')) {
            note = note.replace('Kills:', 'Floors:');
          }
        }

        if (note && !note.startsWith('Verified by') && !note.includes('via reaction')) {
          return `• ${s.member.nickname} (${note})`;
        }
        return `• ${s.member.nickname}`;
      };

      const fields = [
        { 
          name: `✅ Completed (${completed.length})`, 
          value: completed.length > 0 ? completed.map(formatMemberLine).join('\n') : 'None yet',
          inline: true 
        },
        { 
          name: `❌ Not Complete (${notCompleted.length})`, 
          value: notCompleted.length > 0 ? notCompleted.map(formatMemberLine).join('\n') : 'None',
          inline: true 
        }
      ];

      if (check.status !== 'COMPLETED') {
        fields.push({ 
          name: `⏳ Pending (${pending.length})`, 
          value: pending.length > 0 ? pending.map(formatMemberLine).join('\n') : 'None',
          inline: true 
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`${statusEmoji[check.status] || '📊'} Details: ${check.title}`)
        .setDescription(`Status: \`${check.status}\`\nDeadline: **${check.endDate ? formatDate(check.endDate) : 'N/A'}** (<t:${Math.floor(check.endDate!.getTime() / 1000)}:F>)`)
        .setColor(0x38bdf8)
        .addFields(fields)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

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
      return interaction.editReply('📭 No active progression checks found.');
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Progression Checks')
      .setColor(0x38bdf8)
      .setTimestamp();

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
