import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('draft-announcement')
  .setDescription('Create a draft announcement with preview and approval (Admin Only)')
  .addStringOption(option => 
    option.setName('title')
      .setDescription('The title of the announcement')
      .setRequired(true)
  )
  .addStringOption(option => 
    option.setName('content')
      .setDescription('The main content of the announcement (use \\n for new lines)')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  const title = interaction.options.getString('title', true);
  const content = interaction.options.getString('content', true).replace(/\\n/g, '\n');

  const previewEmbed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(content)
    .setColor(0x38bdf8)
    .setFooter({ text: 'Draft Preview - Not sent yet' })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('announce_send_test')
      .setLabel('Send to Test Channel')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('announce_send_official')
      .setLabel('Publish Official (@Dark Stars)')
      .setStyle(ButtonStyle.Success)
  );

  await interaction.reply({
    content: '📑 **Announcement Draft Created!** Please review and choose an action:',
    embeds: [previewEmbed],
    components: [row],
    ephemeral: true
  });
}
