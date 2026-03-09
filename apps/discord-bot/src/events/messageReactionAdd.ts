import {
  ActionRowBuilder,
  EmbedBuilder,
  Events,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  User,
} from 'discord.js';

const HOF_CHANNEL_ID = process.env['HOF_CHANNEL_ID'];
const TEST_CHANNEL_ID = process.env['TEST_CHANNEL_ID'];

export const name = Events.MessageReactionAdd;

export async function execute(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
) {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  const allowedChannels = [HOF_CHANNEL_ID, TEST_CHANNEL_ID];
  if (!allowedChannels.includes(reaction.message.channelId)) return;

  if (reaction.emoji.name === '✅') {
    const message = reaction.message;
    const hasImage = message.attachments.size > 0;
    if (!hasImage) return;

    console.log(
      `✨ Valid entry detected in <#${message.channelId}> from ${message.author?.username}`,
    );

    const categorySelect = new StringSelectMenuBuilder()
      .setCustomId('hof_category')
      .setPlaceholder('Select Contribution Category')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Crests')
          .setValue('CRESTS')
          .setDescription('4 plus or Crest Burst'),
        new StringSelectMenuOptionBuilder()
          .setLabel('EX/Ruins LB')
          .setValue('LB_EX')
          .setDescription('EX1, EX2, EX or Ruins 1-5'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Blue Stage LB')
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
      .setFooter({ text: 'DarkStar Management System' });

    try {
      await message.reply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('Failed to send menu:', err);
    }
  }
}
