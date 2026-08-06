import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../../database/prisma';
import { buildImageHeader } from '../utils/cart.utils';
import { PointWizardService } from '../services/point-wizard.service';

export const data = new SlashCommandBuilder()
  .setName('wizard')
  .setDescription('Start the Point Wizard for a specific message link (useful for old messages)')
  .addStringOption(option => 
    option.setName('link')
      .setDescription('The link to the Discord message containing the image')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // 1. Security Check
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ You do not have permission to use this.', flags: [MessageFlags.Ephemeral] });
  }

  const link = interaction.options.getString('link', true);
  
  // Extract IDs from link: https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID
  const match = link.match(/channels\/\d+\/(\d+)\/(\d+)/);
  if (!match) {
    return interaction.reply({ content: '❌ Invalid message link format.', flags: [MessageFlags.Ephemeral] });
  }

  const channelId = match[1];
  const messageId = match[2];

  try {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const channel = await interaction.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      return interaction.editReply({ content: '❌ Could not find the channel or it is not a text channel.' });
    }

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      return interaction.editReply({ content: '❌ Could not find the message.' });
    }

    const author = message.author;
    if (!author || author.bot) {
      return interaction.editReply({ content: '❌ You can only award points to actual members.' });
    }

    const hasImage = message.attachments.some(att => att.contentType?.startsWith('image/'));
    if (!hasImage) {
      return interaction.editReply({ content: '❌ This message does not contain any images.' });
    }

    const member = await prisma.member.findUnique({ where: { discordId: author.id } });
    if (!member) {
      return interaction.editReply({ content: `❌ Member <@${author.id}> is not registered in the system.` });
    }

    // 2. Find the season that covers the message date
    const msgDate = message.createdAt;
    const targetSeason = await prisma.season.findFirst({
      where: {
        startDate: { lte: msgDate },
        OR: [{ endDate: null }, { endDate: { gte: msgDate } }]
      },
      orderBy: { startDate: 'desc' }
    });

    if (!targetSeason) {
      const monthName = msgDate.toLocaleString('en-US', { month: 'long' });
      const year = msgDate.getFullYear();
      return interaction.editReply({ 
        content: `❌ **Error:** No season found for **${monthName} ${year}**. Please create a season for this period first.`
      });
    }

    const imageAttachments = message.attachments.filter(att => att.contentType?.startsWith('image/'));
    const imageCount = imageAttachments.size;
    const imgHeader = buildImageHeader(imageAttachments);
    const categoryRows = PointWizardService.buildCategoryRows(member.id, message.id);
    const effectiveTotal = Math.min(imageCount, 5);

    const embed = new EmbedBuilder()
      .setTitle(`Point Wizard for ${member.nickname}`)
      .setDescription(`${imgHeader}\n\nPlease select the point category for **Image 1/${effectiveTotal}**:`)
      .setColor(0x38bdf8);

    const firstImage = imageAttachments.first();
    if (firstImage) {
      embed.setThumbnail(firstImage.url);
    }

    await interaction.editReply({
      content: `${imgHeader}\nPoint Wizard for **${member.nickname}** (Image 1/${effectiveTotal}):`,
      embeds: [embed],
      components: categoryRows
    });

  } catch (error) {
    console.error('Wizard Command Error:', error);
    await interaction.editReply({ content: '❌ Error initializing wizard. Make sure the bot has access to that channel.' });
  }
}
