import { ContextMenuCommandBuilder, ApplicationCommandType, MessageContextMenuCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../../database/prisma';
import { buildMediaHeader, extractMessageMedia } from '../utils/cart.utils';
import { PointWizardService } from '../services/point-wizard.service';

export const data = new ContextMenuCommandBuilder()
  .setName('Award Points')
  .setType(ApplicationCommandType.Message);

export async function execute(interaction: MessageContextMenuCommandInteraction) {
  // 0. Environment Check (Local Bot Only)
  if (process.env['IS_LOCAL_BOT'] !== 'true') {
    return interaction.reply({ content: '❌ Award Point is disabled on the 24/7 cloud bot. Please run your local bot instance (`npm run bot:prod`) to calculate points.', flags: [MessageFlags.Ephemeral] });
  }

  // 1. Security Check (Only Admins)
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ You do not have permission to use this.', flags: [MessageFlags.Ephemeral] });
  }

  try {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // 2. Channel Restriction (HOF or Test Channel)
    const hofId = process.env['HOF_CHANNEL_ID'];
    const testId = process.env['TEST_CHANNEL_ID'];
    if (interaction.channelId !== hofId && interaction.channelId !== testId) {
      return interaction.editReply({ content: '❌ This command can only be used in the HOF or Test channel.' });
    }

    const message = interaction.targetMessage;
    const author = message.author;

    if (!author || author.bot) {
      return interaction.editReply({ content: '❌ You can only award points to actual members.' });
    }

    // 3. Media Restriction (Image or Video)
    const media = extractMessageMedia(message);
    if (!media.images.length && !media.videos.length) {
      return interaction.editReply({ content: '❌ No image or video attachments/links found.' });
    }

    // 4. Duplicate Prevention (Check if Bot already reacted with ✅)
    const reactions = message.reactions.cache;
    const tickReaction = reactions.get('✅');
    if (tickReaction) {
      const users = await tickReaction.users.fetch();
      if (users.has(interaction.client.user?.id || '')) {
        return interaction.editReply({
          content: '❌ Already processed. Use `/season fix old-season` to edit past points.'
        });
      }
    }

    // 5. Season Validation (Auto-find based on message date)
    const msgDate = message.createdAt;
    const targetSeason = await prisma.season.findFirst({
      where: {
        startDate: { lte: msgDate },
        OR: [
          { endDate: null },
          { endDate: { gte: msgDate } }
        ]
      },
      orderBy: { startDate: 'desc' }
    });

    if (!targetSeason) {
      const monthName = msgDate.toLocaleString('en-US', { month: 'long' });
      const year = msgDate.getFullYear();
      return interaction.editReply({ 
        content: `❌ No active season for **${monthName} ${year}**.`
      });
    }

    // 6. Find Member in DB
    const member = await prisma.member.findUnique({ where: { discordId: author.id } });
    if (!member) {
      return interaction.editReply({ content: `❌ Member <@${author.id}> not found in database.` });
    }

    // 7. Send Ephemeral Menu
    const mediaHeader = buildMediaHeader(media);
    const categoryRows = PointWizardService.buildCategoryRows(member.id, message.id);
    const content = mediaHeader
      ? `Target: **${member.nickname}**\n${mediaHeader}\n\nSelect category:`
      : `Target: **${member.nickname}**\n\nSelect category:`;

    await interaction.editReply({
      content,
      components: categoryRows
    });

  } catch (error) {
    console.error('Context Menu Point Error:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: '❌ Error initializing point wizard.' });
    } else {
      await interaction.reply({ content: '❌ Error initializing point wizard.', flags: [MessageFlags.Ephemeral] });
    }
  }
}
