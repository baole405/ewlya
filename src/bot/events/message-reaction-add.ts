import {
  MessageReaction,
  User,
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Events,
} from 'discord.js';

/**
 * Handle Message Reaction Add Event
 * Triggers the contribution point recording flow
 */
export const name = Events.MessageReactionAdd;
export const once = false;

export async function execute(reaction: MessageReaction, user: User) {
  // Ignore bot reactions
  if (user.bot) return;

  // Handle partials
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('❌ Failed to fetch reaction:', error);
      return;
    }
  }

  const { message, emoji } = reaction;

  // Check if emoji is "white_check_mark"
  if (emoji.name === '✅') {
    // Only allow Admins to verify points
    const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
    if (!adminIds.includes(user.id)) return;

    console.log(`🎯 Verification triggered by ${user.username} for message: ${message.id}`);

    // Create Category Selection Menu
    const categorySelect = new StringSelectMenuBuilder()
      .setCustomId('hof_category')
      .setPlaceholder('Select Contribution Category')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Clear Time (HOF)')
          .setValue('HOF')
          .setDescription('Leaderboard rankings / clear time records'),
        new StringSelectMenuOptionBuilder()
          .setLabel('EX / Ruins (LB)')
          .setValue('LB_EX')
          .setDescription('EX1, EX2, EX or Ruins 1-5'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Blue Stage (LB)')
          .setValue('LB_BLUE')
          .setDescription('No prefix / Normal stage leaderboards'),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categorySelect);

    const embed = new EmbedBuilder()
      .setColor(0xa855f7)
      .setTitle('🔥 Clan Contribution Point')
      .setDescription(
        `Recording points for **${message.author?.username}**.\n\nPlease select the category:`,
      )
      .setFooter({ text: `Verifier: ${user.username}` });

    try {
      await user.send({ embeds: [embed], components: [row] });
      // Optionally notify in channel that DM was sent
    } catch (err) {
      console.error('❌ Could not send DM to admin:', err);
    }
  }
}
