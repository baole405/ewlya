import { MessageReaction, User, PartialMessageReaction, PartialUser, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../../database/prisma';
import { LoggerService } from '../services/logger.service';

export const name = Events.MessageReactionAdd;

export async function execute(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  if (reaction.partial) {
    try { await reaction.fetch(); } catch (error) { return; }
  }

  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
  if (!adminIds.includes(user.id)) return;

  const message = reaction.message;
  const author = message.author;
  if (!author || author.bot) return;

  // ---------------------------------------------------------
  // 1. PROGRESSION VERIFICATION (✅)
  // ---------------------------------------------------------
  if (reaction.emoji.name === '✅') {
    const devChannelId = process.env['PROGRESSION_CHECK_ID_DEVELOPER'];
    const officialChannelId = process.env['PROGRESSION_CHECK_ID'];
    
    // Only allow in designated channels
    if (message.channelId !== devChannelId && message.channelId !== officialChannelId) return;

    try {
      const member = await prisma.member.findUnique({ where: { discordId: author.id } });
      if (!member) return;

      const activeCheck = await prisma.progressionCheck.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' }
      });
      if (!activeCheck) return;

      const status = await prisma.memberProgressionStatus.update({
        where: {
          progressionCheckId_memberId: {
            progressionCheckId: activeCheck.id,
            memberId: member.id
          }
        },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          note: `Verified by ${user.username} via reaction`
        }
      });

      if (status) {
        await LoggerService.logAction(
          reaction.client,
          '✅ Progression Verified',
          `Admin **${user.username}** verified progression for **${member.nickname}** via reaction.`,
          0x22c55e,
          [{ name: 'Event', value: activeCheck.title }, { name: 'Member ID', value: `\`${member.id}\`` }]
        );

        const notifyChannelId = process.env['PROGRESSION_CHECK_ID'] || '1244510079873450097';
        const channel = await reaction.client.channels.fetch(notifyChannelId);
        
        if (channel && channel.isTextBased()) {
          const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' });
          await channel.send(`🔔 <@${member.discordId}>, you've successfully completed the progression check of **${activeCheck.title}**!\n⏰ *Verified at: ${timestamp} (GMT+7)*`);
        }
      }
    } catch (error) {
      console.error('Progression Error:', error);
    }
    return;
  }

  // ---------------------------------------------------------
  // 2. CALCULATED POINTS WIZARD (🧮 or 🔢)
  // ---------------------------------------------------------
  if (reaction.emoji.name === '🧮' || reaction.emoji.name === '🔢') {
    try {
      // 1. Channel Restriction (HOF or Test Channel)
      const hofId = process.env['HOF_CHANNEL_ID'];
      const testId = process.env['TEST_CHANNEL_ID'];
      if (message.channelId !== hofId && message.channelId !== testId) return;

      // 2. Only trigger if the message has an image attachment
      const hasImage = message.attachments.some(att => att.contentType?.startsWith('image/'));
      if (!hasImage) return;

      // 3. Duplicate Prevention (Check if Bot already reacted with ✅)
      const reactions = message.reactions.cache;
      const tickReaction = reactions.get('✅');
      if (tickReaction) {
        const users = await tickReaction.users.fetch();
        if (users.has(reaction.client.user?.id || '')) {
          const warning = await message.reply(`❌ **Warning:** This image has already been processed. (This message will be deleted in 5 seconds)`);
          setTimeout(() => warning.delete().catch(() => null), 5000);
          return;
        }
      }

      const member = await prisma.member.findUnique({ where: { discordId: author.id } });
      if (!member) return;

      // 4. Season Validation (Auto-find based on message date)
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
        const warning = await message.reply(`❌ **Error:** No season found for **${monthName} ${year}**. (Self-deleting in 5s)`);
        setTimeout(() => warning.delete().catch(() => null), 5000);
        await reaction.users.remove(user.id).catch(() => null);
        return;
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`calc_cat_crest_${member.id}_${message.id}`)
          .setLabel('💎 Crest')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`calc_cat_ldb_${member.id}_${message.id}`)
          .setLabel('🏆 Leaderboard')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`calc_cat_sreq_${member.id}_${message.id}`)
          .setLabel("🛠️ SR's EQ")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`calc_cancel_${message.id}`)
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      const imageCount = message.attachments.filter(att => att.contentType?.startsWith('image/')).size;
      console.log(`[Wizard] Triggered by ${user.username}. Detected ${imageCount} images from ${author.username}`);

      await message.reply({
        content: `📸 **Detected ${imageCount} image(s)** in this submission.\nHey <@${user.id}>, please select the point category for **${member.nickname}** (Image 1/${imageCount}):`,
        components: [row],
        allowedMentions: { repliedUser: false }
      });

    } catch (error) {
      console.error('Points Wizard Error:', error);
    }
    return;
  }
}
