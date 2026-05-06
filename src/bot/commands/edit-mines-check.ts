import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('edit-mines-check')
  .setDescription('Edit an existing Mines check (Admin Only)')
  .addStringOption(option => 
    option.setName('id')
      .setDescription('The ID of the check to edit')
      .setRequired(true)
  )
  .addStringOption(option => 
    option.setName('title')
      .setDescription('New title for the check')
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

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  const id = interaction.options.getString('id', true);
  const newTitle = interaction.options.getString('title');
  const addDays = interaction.options.getInteger('add_days');
  const newStatus = interaction.options.getString('status');

  await interaction.deferReply({ ephemeral: true });

  try {
    const check = await prisma.progressionCheck.findUnique({ where: { id } });
    if (!check) return interaction.editReply('❌ Check not found.');

    const updateData: any = {};
    if (newTitle) updateData.title = newTitle;
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

    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      return `${day}/${month}`;
    };

    const statusEmoji: Record<string, string> = {
      'ACTIVE': '🟢',
      'POSTPONED': '🟠',
      'COMPLETED': '✅'
    };

    const currentStatus = updated.status || 'ACTIVE';

    const embed = new EmbedBuilder()
      .setTitle('📝 Mines Check Updated')
      .setColor(0x38bdf8)
      .addFields(
        { name: 'Title', value: updated.title, inline: false },
        { name: 'Status', value: `${statusEmoji[currentStatus] || ''} ${currentStatus}`, inline: true },
        { name: 'End Date', value: updated.endDate ? `🏁 **${formatDate(updated.endDate)}**` : 'None', inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to update Mines check.');
  }
}
