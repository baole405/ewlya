import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} from 'discord.js';

export const data = new ContextMenuCommandBuilder()
  .setName('Record Mines Drop')
  .setType(ApplicationCommandType.Message);

export async function execute(interaction: MessageContextMenuCommandInteraction) {
  // 1. Security Check (Admins & Authorized users)
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(Boolean);
  const authorizedIds = [...adminIds, '152989780274184192', '517740134440075274'];
  const guildMember = interaction.guild?.members.cache.get(interaction.user.id) ||
    await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);

  const isAuthorized =
    authorizedIds.includes(interaction.user.id) ||
    guildMember?.permissions.has('Administrator') ||
    (interaction.user.username ? interaction.user.username.toLowerCase().includes('grimex') : false);

  if (!isAuthorized) {
    return interaction.reply({
      content: '❌ You do not have permission to use this command.',
      flags: [MessageFlags.Ephemeral],
    });
  }

  const message = interaction.targetMessage;
  const author = message.author;

  if (!author || author.bot) {
    return interaction.reply({
      content: '❌ You can only record drops for actual clan members.',
      flags: [MessageFlags.Ephemeral],
    });
  }

  // 2. Build Modal for Drop Count & Reason
  const modal = new ModalBuilder()
    .setCustomId(`mines_modal_${message.id}_${message.channelId}_${author.id}`)
    .setTitle('⛏️ Record Mines Drops');

  const countInput = new TextInputBuilder()
    .setCustomId('drop_count')
    .setLabel('Number of Drops')
    .setStyle(TextInputStyle.Short)
    .setValue('1')
    .setPlaceholder('e.g. 1, 2, 5, 9...')
    .setRequired(true);

  const reasonInput = new TextInputBuilder()
    .setCustomId('drop_reason')
    .setLabel('Note / Reason (Optional)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Mines B500F drops')
    .setRequired(false);

  const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(countInput);
  const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);

  modal.addComponents(row1, row2);

  // 3. Show Modal
  await interaction.showModal(modal);
}
