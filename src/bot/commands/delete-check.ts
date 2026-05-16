import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, AutocompleteInteraction } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('delete-check')
  .setDescription('Delete a progression check (Admin Only)')
  .addStringOption(option => 
    option.setName('id')
      .setDescription('The check to delete (Leave empty to delete the ACTIVE check)')
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
    let checkId = id;
    let check;

    if (!checkId) {
      // Find the active check automatically
      check = await prisma.progressionCheck.findFirst({
        where: { deletedAt: null, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      });
      if (!check) {
        return interaction.editReply('❌ No active progression check found. Please select a specific check to delete.');
      }
      checkId = check.id;
    } else {
      check = await prisma.progressionCheck.findUnique({ where: { id: checkId } });
      if (!check) {
        return interaction.editReply('❌ Progression check not found with the selected ID.');
      }
    }

    // Soft delete
    await prisma.progressionCheck.update({
      where: { id: checkId },
      data: { deletedAt: new Date() }
    });

    await interaction.editReply(`✅ Successfully deleted progression check: **${check.title}**`);
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to delete check.');
  }
}
