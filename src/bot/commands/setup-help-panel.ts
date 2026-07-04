import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('setup-help-panel')
  .setDescription('Deploy a permanent help panel in the current channel (Admin Only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle('🌟 Welcome to the DarkStar Hub!')
    .setDescription("Hello everyone! I am **Liza**, the dedicated assistant for DarkStar.\n\nI am here to help you track your progression, check leaderboard points, and manage seasonal records. Whether you are a new recruit or a seasoned veteran, I've got you covered!\n\n**Need help?** Click the button below to view the commands available to you.")
    .setColor(0x38bdf8)
    .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
    .setFooter({ text: 'DarkStar Management System' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('help_view_commands')
      .setLabel('🆘 View Commands')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('help_season_ldb')
      .setLabel('🏆 Season LDB')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('help_clan_vision')
      .setLabel('🌌 Clan Vision')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('help_edit_member')
      .setLabel('👤 Profile')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('help_ask_liza')
      .setLabel("💬 Ask DarkStar's Mascot")
      .setStyle(ButtonStyle.Danger)
  );

  if (interaction.channel && interaction.channel.isTextBased()) {
    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Help panel deployed successfully.', ephemeral: true });
  } else {
    await interaction.reply({ content: '❌ Could not send message to this channel.', ephemeral: true });
  }
}
