import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  AutocompleteInteraction, 
  EmbedBuilder 
} from 'discord.js';
import { prisma } from '../../database/prisma';

export function getProgressUnit(titleOrType: string): 'Floor' | 'Kills' {
  const lower = titleOrType.toLowerCase();
  if (lower.includes('mine') || lower.includes('floor')) {
    return 'Floor';
  }
  if (lower.includes('raid') || lower.includes('kill') || lower.includes('boss')) {
    return 'Kills';
  }
  return 'Floor';
}

export const data = new SlashCommandBuilder()
  .setName('progression')
  .setDescription('View and manage clan progression checks (Mines Floors / Raid Kills)')
  // --- SUBCOMMAND: view ---
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View progress of the active check or a past check')
      .addStringOption(opt =>
        opt.setName('check_id')
          .setDescription('Select a specific check (leave empty to view active check)')
          .setRequired(false)
          .setAutocomplete(true)
      )
  )
  // --- SUBCOMMAND: start ---
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Start a new progression check (Admin Only)')
      .addStringOption(opt =>
        opt.setName('season')
          .setDescription('The season name (e.g., September 2026)')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Type of progression (Mines Floor or Raids Count)')
          .setRequired(true)
          .addChoices(
            { name: 'Mines Floor (Floors)', value: 'Mines Floor' },
            { name: 'Raids Count (Kills)', value: 'Raids Count' }
          )
      )
      .addIntegerOption(opt =>
        opt.setName('target_value')
          .setDescription('Target to reach (e.g., 200 for 200F, 85 for 85 Kills)')
          .setRequired(true)
      )
      .addIntegerOption(opt =>
        opt.setName('days')
          .setDescription('Event duration in days (e.g., 7)')
          .setRequired(true)
      )
  )
  // --- SUBCOMMAND: set ---
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('Manually set Floor, Kills, or Exemption for a member (Admin Only)')
      .addStringOption(opt =>
        opt.setName('member')
          .setDescription('The member to update')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addIntegerOption(opt =>
        opt.setName('value')
          .setDescription('The achieved value (Floor number or Boss Kills)')
          .setRequired(false)
      )
      .addStringOption(opt =>
        opt.setName('note')
          .setDescription('Status or note (e.g., Exempt for approved hiatus)')
          .setRequired(false)
          .addChoices(
            { name: '🛡️ Exempt', value: 'Exempt' },
            { name: '✅ Reached Target', value: 'Completed' },
            { name: '❌ Missed', value: 'Missed' }
          )
      )
      .addStringOption(opt =>
        opt.setName('check_id')
          .setDescription('Check to edit (Leave empty for active or most recent check)')
          .setRequired(false)
          .setAutocomplete(true)
      )
  )
  // --- SUBCOMMAND: extend ---
  .addSubcommand(sub =>
    sub.setName('extend')
      .setDescription('Extend or adjust deadline days for the active check (Admin Only)')
      .addIntegerOption(opt =>
        opt.setName('days')
          .setDescription('Days to add (e.g., 2 for +2 days, -1 to shorten)')
          .setRequired(true)
      )
  )
  // --- SUBCOMMAND: end ---
  .addSubcommand(sub =>
    sub.setName('end')
      .setDescription('End active progression check and finalize records (Admin Only)')
  );

// --- AUTOCOMPLETE HANDLER ---
export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'check_id') {
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

    return interaction.respond(
      checks.map(c => {
        const emoji = statusEmoji[c.status] || '📋';
        const name = `${emoji} ${c.title} (${c.status})`;
        const displayName = name.length > 100 ? name.slice(0, 97) + '...' : name;
        return { name: displayName, value: c.id };
      })
    );
  }

  if (focusedOption.name === 'member') {
    const members = await prisma.member.findMany({
      where: {
        status: 'OFFICIAL',
        OR: [
          { nickname: { contains: focusedOption.value, mode: 'insensitive' } },
          { ign: { contains: focusedOption.value, mode: 'insensitive' } }
        ]
      },
      take: 25
    });

    return interaction.respond(
      members.map(m => ({ name: m.nickname, value: m.id }))
    );
  }
}

// --- MAIN EXECUTE ROUTER ---
export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
  const isAdmin = adminIds.includes(interaction.user.id);

  const adminOnly = ['start', 'set', 'extend', 'end'];
  if (adminOnly.includes(subcommand) && !isAdmin) {
    return interaction.reply({ content: '❌ This action is restricted to Administrators only.', ephemeral: true });
  }

  if (!isAdmin) {
    const member = await prisma.member.findUnique({ where: { discordId: interaction.user.id } });
    if (!member || member.status !== 'OFFICIAL') {
      return interaction.reply({ content: '❌ Progression views are restricted to Official Clan Members only.', ephemeral: true });
    }
  }

  switch (subcommand) {
    case 'view':
      return handleView(interaction);
    case 'start':
      return handleStart(interaction);
    case 'set':
      return handleSet(interaction);
    case 'extend':
      return handleExtend(interaction);
    case 'end':
      return handleEnd(interaction);
    default:
      return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
  }
}

// --- SUBCOMMAND HANDLERS ---

async function handleView(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const checkId = interaction.options.getString('check_id');

    let check: any;
    if (checkId) {
      check = await prisma.progressionCheck.findUnique({
        where: { id: checkId },
        include: {
          requirements: true,
          memberStatuses: { include: { member: true } }
        }
      });
    } else {
      check = await prisma.progressionCheck.findFirst({
        where: { deletedAt: null, status: 'ACTIVE' },
        include: {
          requirements: true,
          memberStatuses: { include: { member: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!check || check.deletedAt) {
      return interaction.editReply('📭 No active progression check found. Admins can start one with `/progression start`.');
    }

    const unit = getProgressUnit(check.title);
    const allMembers = await prisma.member.findMany({ where: { status: 'OFFICIAL' } });
    const existingStatusMap = new Map(check.memberStatuses.map((s: any) => [s.memberId, s]));

    const completed: any[] = [];
    const exempt: any[] = [];
    const notCompleted: any[] = [];
    const pending: any[] = [];

    for (const m of allMembers) {
      const s: any = existingStatusMap.get(m.id);
      if (!s) {
        pending.push({ member: m, note: null });
      } else if (s.note && s.note.toLowerCase().includes('exempt')) {
        exempt.push(s);
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
      'CLOSED': '🔴',
      'COMPLETED': '✅'
    };

    const formatDate = (date: Date) => `${date.getDate()}/${date.toLocaleString('en-US', { month: 'long' })}`;
    const totalOfficial = allMembers.length;
    const progressPercent = totalOfficial > 0 ? Math.round((completed.length / totalOfficial) * 100) : 0;

    const formatNote = (noteStr: string | null) => {
      if (!noteStr) return '';
      if (noteStr.includes('Exempt')) return '';
      if (unit === 'Floor') {
        const cleaned = noteStr.replace(/Kills:\s*/i, 'Floor: ');
        return ` (${cleaned.includes('Floor:') ? cleaned : `Floor: ${cleaned}`})`;
      } else {
        const cleaned = noteStr.replace(/Floors?:\s*/i, 'Kills: ');
        return ` (${cleaned.includes('Kills:') ? cleaned : `Kills: ${cleaned}`})`;
      }
    };

    const embed = new EmbedBuilder()
      .setTitle(`${statusEmoji[check.status] || '📋'} Progression: ${check.title}`)
      .setColor(0x38bdf8)
      .setDescription(
        `**End Date:** ${check.endDate ? formatDate(check.endDate) : 'N/A'}\n` +
        `**Unit Type:** **${unit}**\n` +
        `**Completion:** **${completed.length}/${totalOfficial}** Official Members (${progressPercent}%)\n` +
        `**Status:** \`${check.status}\``
      )
      .addFields(
        {
          name: `✅ Completed (${completed.length})`,
          value: completed.length > 0
            ? completed.map(s => `• **${s.member.nickname}**${formatNote(s.note)}`).join('\n').slice(0, 1024)
            : '*None yet*',
          inline: false
        }
      )
      .setTimestamp();

    if (exempt.length > 0) {
      embed.addFields({
        name: `🛡️ Exempt (${exempt.length})`,
        value: exempt.map(s => `• ${s.member.nickname} *(Exempted)*`).join(', ').slice(0, 1024),
        inline: false
      });
    }

    embed.addFields({
      name: `⏳ Pending (${pending.length})`,
      value: pending.length > 0
        ? pending.map(s => `• ${s.member.nickname}`).join(', ').slice(0, 1024)
        : '*None*',
      inline: false
    });

    if (notCompleted.length > 0) {
      embed.addFields({
        name: `❌ Not Completed (${notCompleted.length})`,
        value: notCompleted.map(s => `• ${s.member.nickname}${formatNote(s.note)}`).join('\n').slice(0, 1024),
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /progression view:', error);
    await interaction.editReply('❌ Failed to retrieve progression status.');
  }
}

async function handleStart(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const season = interaction.options.getString('season', true);
    const type = interaction.options.getString('type', true);
    const targetValue = interaction.options.getInteger('target_value', true);
    const days = interaction.options.getInteger('days', true);

    const activeCheck = await prisma.progressionCheck.findFirst({
      where: { deletedAt: null, status: 'ACTIVE' }
    });

    if (activeCheck) {
      return interaction.editReply(
        `❌ An **ACTIVE** progression check (**${activeCheck.title}**) is already running.\n` +
        `Please finalize it using \`/progression end\` before starting a new one.`
      );
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    const title = `${season} - ${type}`;
    const unit = getProgressUnit(type);

    const newCheck = await prisma.progressionCheck.create({
      data: {
        title,
        startDate,
        endDate,
        status: 'ACTIVE',
        requirements: {
          create: [
            {
              title: `${type} Requirement`,
              targetValue: targetValue.toString()
            }
          ]
        }
      }
    });

    const officialMembers = await prisma.member.findMany({ where: { status: 'OFFICIAL' } });
    if (officialMembers.length > 0) {
      await prisma.memberProgressionStatus.createMany({
        data: officialMembers.map(m => ({
          progressionCheckId: newCheck.id,
          memberId: m.id,
          isCompleted: false
        }))
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🚀 New Progression Check Started!')
      .setColor(0x10b981)
      .setDescription(`Started progression check: **${title}**`)
      .addFields(
        { name: 'Target', value: `${unit}: ${targetValue}`, inline: true },
        { name: 'Duration', value: `${days} days`, inline: true },
        { name: 'Members Tracked', value: `${officialMembers.length}`, inline: true }
      )
      .setFooter({ text: `ID: ${newCheck.id} • Unit: ${unit}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /progression start:', error);
    await interaction.editReply('❌ Failed to start progression check.');
  }
}

async function handleSet(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const memberId = interaction.options.getString('member', true);
    const value = interaction.options.getInteger('value');
    const customNote = interaction.options.getString('note');
    const checkId = interaction.options.getString('check_id');

    if (value === null && !customNote) {
      return interaction.editReply('❌ Please provide at least a `value` (e.g. 200) or select a `note` (e.g. Exempt).');
    }

    let targetCheck: any;
    if (checkId) {
      targetCheck = await prisma.progressionCheck.findUnique({
        where: { id: checkId },
        include: { requirements: true }
      });
    } else {
      // Prioritize active check
      targetCheck = await prisma.progressionCheck.findFirst({
        where: { deletedAt: null, status: 'ACTIVE' },
        include: { requirements: true },
        orderBy: { createdAt: 'desc' }
      });
      // Fallback: If check was ended, allow modifying the most recent check so no one is locked out!
      if (!targetCheck) {
        targetCheck = await prisma.progressionCheck.findFirst({
          where: { deletedAt: null },
          include: { requirements: true },
          orderBy: { createdAt: 'desc' }
        });
      }
    }

    if (!targetCheck) {
      return interaction.editReply('❌ No progression check found to update.');
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return interaction.editReply('❌ Member not found.');
    }

    const unit = getProgressUnit(targetCheck.title);
    const req = targetCheck.requirements[0];
    const target = req && req.targetValue ? parseInt(req.targetValue, 10) : 0;

    let isCompleted = false;
    let note = '';

    if (customNote === 'Exempt') {
      isCompleted = true;
      note = '🛡️ Exempt';
    } else if (value !== null && value !== undefined) {
      isCompleted = target > 0 ? value >= target : true;
      note = `${unit}: ${value}`;
    } else if (customNote === 'Completed') {
      isCompleted = true;
      note = `${unit}: ${target > 0 ? target : (unit === 'Floor' ? '200' : '100')}`;
    } else if (customNote === 'Missed') {
      isCompleted = false;
      note = `${unit}: 0`;
    }

    await prisma.memberProgressionStatus.upsert({
      where: {
        progressionCheckId_memberId: {
          progressionCheckId: targetCheck.id,
          memberId: member.id
        }
      },
      update: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        note
      },
      create: {
        progressionCheckId: targetCheck.id,
        memberId: member.id,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        note
      }
    });

    const statusBadge = customNote === 'Exempt' ? '🛡️ **Exempt**' : (isCompleted ? '✅ **Target Reached!**' : '⏳ **In Progress**');
    const embed = new EmbedBuilder()
      .setTitle(`🎯 Progress Updated (${unit})`)
      .setColor(isCompleted ? 0x10b981 : 0x38bdf8)
      .setDescription(
        `Updated record for **${member.nickname}** in **${targetCheck.title}**\n\n` +
        `• **Progress Note:** \`${note}\`\n` +
        `• **Status:** ${statusBadge}\n` +
        `• **Check State:** \`${targetCheck.status}\``
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /progression set:', error);
    await interaction.editReply('❌ Failed to update member progression.');
  }
}

async function handleExtend(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const days = interaction.options.getInteger('days', true);
    const check = await prisma.progressionCheck.findFirst({
      where: { deletedAt: null, status: 'ACTIVE' }
    });

    if (!check) {
      return interaction.editReply('❌ No active progression check found to extend.');
    }

    const currentEnd = check.endDate ? new Date(check.endDate) : new Date();
    currentEnd.setDate(currentEnd.getDate() + days);

    const updated = await prisma.progressionCheck.update({
      where: { id: check.id },
      data: { endDate: currentEnd }
    });

    const formatDate = (date: Date) => `${date.getDate()}/${date.toLocaleString('en-US', { month: 'long' })}`;

    const embed = new EmbedBuilder()
      .setTitle('⏳ Progression Deadline Adjusted')
      .setColor(0x10b981)
      .setDescription(
        `The deadline for **${updated.title}** has been updated!\n\n` +
        `• **Days Changed:** ${days > 0 ? `+${days}` : days} days\n` +
        `• **New Deadline:** **${formatDate(currentEnd)}**`
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /progression extend:', error);
    await interaction.editReply('❌ Failed to extend progression check.');
  }
}

async function handleEnd(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const check = await prisma.progressionCheck.findFirst({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });

    if (!check) {
      return interaction.editReply('❌ No active progression check found to end.');
    }

    const unit = getProgressUnit(check.title);

    // Only set note = Floor: 0 / Kills: 0 for those who are uncompleted and not exempted!
    await prisma.memberProgressionStatus.updateMany({
      where: {
        progressionCheckId: check.id,
        isCompleted: false,
        note: null
      },
      data: { note: `${unit}: 0` }
    });

    await prisma.progressionCheck.update({
      where: { id: check.id },
      data: { status: 'COMPLETED' }
    });

    const embed = new EmbedBuilder()
      .setTitle('🏁 Progression Check Finalized')
      .setColor(0x10b981)
      .setDescription(
        `The active check **${check.title}** has ended and is marked as **COMPLETED**.\n` +
        `All uncompleted members without exemption are recorded as \`${unit}: 0\`.\n\n` +
        `*💡 Tip: If you need to fix a missed member later, you can still use \`/progression set\` anytime!*`
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /progression end:', error);
    await interaction.editReply('❌ Failed to finalize progression check.');
  }
}
