import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../../database/prisma';
import { performMemberSync, generateConfirmationBoard } from '../utils/sync-helper';

export const data = new SlashCommandBuilder()
  .setName('trigger-monthly-membercheck')
  .setDescription('Cheat command to trigger the monthly member check (Dev only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Only allow in TEST_CHANNEL_ID: 1424269975698407454
  if (interaction.channelId !== '1424269975698407454') {
    return interaction.reply({ content: '❌ This command can only be used in the designated test channel.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: false });

  try {
    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(id => id);
    
    let roleMention = '@mod';
    if (interaction.guild) {
      const modRole = interaction.guild.roles.cache.find((r: any) => r.name.toLowerCase() === 'mod');
      if (modRole) roleMention = `<@&${modRole.id}>`;
    }

    if (interaction.guild) {
      try {
        await performMemberSync(interaction.guild, adminIds);
      } catch (e) {
        console.error('Auto sync failed during cheat command:', e);
      }
    }

    const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
    const { embed, components } = await generateConfirmationBoard(adminIds, roleMention, currentMonthName);

    await interaction.editReply({
      content: `🔔 ALERT ${roleMention}`,
      embeds: [embed],
      components
    });

  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to trigger monthly member check.');
  }
}
