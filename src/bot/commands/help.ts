import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription("Show Liza's introduction and command list");

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('🌟 Hello, I am Liza!')
    .setDescription('I am the dedicated assistant for DarkStar. My main job is to help manage progression, award points, and assist members in their journey.\n\nClick the button below to see the commands available to you!')
    .setColor(0x38bdf8)
    .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
    .setFooter({ text: 'DarkStar Management System' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('help_view_commands')
      .setLabel('🆘 View Commands')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}
