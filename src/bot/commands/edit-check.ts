import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, AutocompleteInteraction } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('edit-check')
  .setDescription('Edit an existing progression check (Admin Only)')
  .addStringOption(option => 
    option.setName('id')
      .setDescription('The check to edit')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption(option => 
    option.setName('title')
      .setDescription('New title for the check')
      .setRequired(false)
      .setAutocomplete(true)
  )
  .addIntegerOption(option => 
    option.setName('target_value')
      .setDescription('New target value to reach (e.g., 100)')
      .setRequired(false)
  )
  .addIntegerOption(option => 
    option.setName('add_days')
      .setDescription('Add/subtract days from the current end date')
      .setRequired(false)
  )
  .addStringOption(option => 
    option.setName('status')
      .setDescription('Set status (ACTIVE, POSTPONED, CLOSED)')
      .setRequired(false)
      .addChoices(
        { name: 'Active', value: 'ACTIVE' },
        { name: 'Postponed', value: 'POSTPONED' },
        { name: 'Completed', value: 'COMPLETED' }
      )
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
  } else if (focusedOption.name === 'title') {
    const checkId = interaction.options.getString('id');
    if (checkId) {
      const check = await prisma.progressionCheck.findUnique({
        where: { id: checkId }
      });
      if (check) {
        await interaction.respond([
          { name: `Current: ${check.title}`, value: check.title }
        ]);
        return;
      }
    }
    await interaction.respond([]);
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  const id = interaction.options.getString('id', true);
  const newTitle = interaction.options.getString('title');
  const targetValue = interaction.options.getInteger('target_value');
  const addDays = interaction.options.getInteger('add_days');
  const newStatus = interaction.options.getString('status');

  await interaction.deferReply({ ephemeral: true });

  try {
    const check = await prisma.progressionCheck.findUnique({ where: { id } });
    if (!check) return interaction.editReply('❌ Check not found.');

    // Find associated requirement to extract old target value
    const requirement = await prisma.progressionRequirement.findFirst({
      where: { progressionCheckId: id }
    });

    let oldTargetValue: number | null = null;
    if (requirement) {
      const match = requirement.title.match(/\d+/);
      if (match) {
        oldTargetValue = parseInt(match[0], 10);
      }
    }

    const updateData: any = {};
    if (newTitle) updateData.title = newTitle;

    if (targetValue !== null) {
      // Also update the ProgressionRequirement associated with this check
      await prisma.progressionRequirement.updateMany({
        where: { progressionCheckId: id },
        data: {
          title: `Reach ${targetValue}`,
          description: `Required to reach ${targetValue} within the time limit.`
        }
      });
    }
    if (newStatus) updateData.status = newStatus;
    
    if (addDays !== null && check.endDate) {
      const newEndDate = new Date(check.endDate);
      newEndDate.setDate(newEndDate.getDate() + (addDays || 0));
      updateData.endDate = newEndDate;
    }

    const updated = await (prisma.progressionCheck as any).update({
      where: { id },
      data: updateData
    });

    const updatedReq = await prisma.progressionRequirement.findFirst({
      where: { progressionCheckId: updated.id }
    });
    const targetText = updatedReq ? updatedReq.title : 'None';

    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      return `${day}/${month}`;
    };

    const statusEmoji: Record<string, string> = {
      'ACTIVE': '🟢',
      'POSTPONED': '🟠',
      'COMPLETED': '✅',
      'CLOSED': '✅'
    };

    const currentStatus = updated.status || 'ACTIVE';

    const embed = new EmbedBuilder()
      .setTitle('📝 Progression Check Updated')
      .setColor(0x38bdf8)
      .addFields(
        { name: 'Title', value: updated.title, inline: false },
        { name: 'Target', value: `🎯 **${targetText}**`, inline: true },
        { name: 'Status', value: `${statusEmoji[currentStatus] || ''} ${currentStatus}`, inline: true },
        { name: 'End Date', value: updated.endDate ? `🏁 **${formatDate(updated.endDate)}**` : 'None', inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to update progression check.');
  }
}
