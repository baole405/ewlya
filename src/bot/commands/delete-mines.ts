import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('delete-mines')
  .setDescription('Delete a Mines progression check (Admin Only)')
  .addStringOption(option => 
    option.setName('id')
      .setDescription('The ID of the check to delete (get it from /list-mines)')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  const id = interaction.options.getString('id', true);
  await interaction.deferReply({ ephemeral: true });

  try {
    const check = await prisma.progressionCheck.findUnique({ where: { id } });
    if (!check) {
      return interaction.editReply('❌ Check not found.');
    }

    // Soft delete
    await prisma.progressionCheck.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    await interaction.editReply(`✅ Successfully deleted Mines check: **${check.title}**`);
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to delete check.');
  }
}
