import { MessageReaction, User, PartialMessageReaction, PartialUser, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';
import { LoggerService } from '../services/logger.service';
import { buildImageHeader } from '../utils/cart.utils';
import { PointWizardService } from '../services/point-wizard.service';
import { MinesDropService } from '../services/mines-drop.service';
import { MemberService } from '../services/member.service';

const progressionLocks = new Set<string>();

export const name = Events.MessageReactionAdd;

export async function execute(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  if (reaction.partial) {
    try { await reaction.fetch(); } catch (error) { return; }
  }
  if (user.partial) {
    try { user = await user.fetch(); } catch (error) { return; }
  }

  let message = reaction.message;
  if (message.partial) {
    try { message = await message.fetch(); } catch (error) { return; }
  }

  const author = message.author;
  if (!author || author.bot) return;
  if (user.bot) return;

  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(Boolean);
  const authorizedIds = [...adminIds, '152989780274184192', '517740134440075274'];
  const guildMember = message.guild?.members.cache.get(user.id) || await message.guild?.members.fetch(user.id).catch(() => null);
  const isAuthorized =
    authorizedIds.includes(user.id) ||
    guildMember?.permissions.has('Administrator') ||
    (user.username ? user.username.toLowerCase().includes('grimex') : false);

  console.log(`[REACTION ADD] User ${user.username} (${user.id}) reacted with ${reaction.emoji.name} on message ${message.id} in channel ${message.channelId} (authorized: ${isAuthorized})`);

  if (!isAuthorized) return;

  // ---------------------------------------------------------
  // 0. HOF CHANNEL ✅ GUARD — Remove non-bot ✅ reactions (HOF ONLY)
  // ---------------------------------------------------------
  const hofChannelId = process.env['HOF_CHANNEL_ID'];
  if (
    hofChannelId &&
    message.channelId === hofChannelId &&
    reaction.emoji.name === '✅' &&
    user.id !== reaction.client.user?.id
  ) {
    // This is a human reacting ✅ in HOF — remove it immediately
    await reaction.users.remove(user.id).catch(() => {});
    return;
  }


  if (reaction.emoji.name === '🧮') {
    const devChannelId = process.env['PROGRESSION_CHECK_ID_DEVELOPER'];
    const officialChannelId = process.env['PROGRESSION_CHECK_ID'];
    
    // Only allow in designated channels
    if (message.channelId !== devChannelId && message.channelId !== officialChannelId) return;

    try {
      const member = await prisma.member.findUnique({ where: { discordId: author.id } });
      if (!member) return;

      const activeCheck = await prisma.progressionCheck.findFirst({
        where: { deletedAt: null, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      });
      if (!activeCheck) return;

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`prog_input_${member.id}_${activeCheck.id}_${message.id}`)
          .setLabel(`📝 Enter Boss Kills/Floors for ${member.nickname}`)
          .setStyle(ButtonStyle.Primary)
      );

      const embed = new EmbedBuilder()
        .setTitle('📊 Progression Verification Input')
        .setDescription(`Admin **${user.username}** reacted with 🧮 to verify progress for **${member.nickname}**.\n\nPlease click the button below to enter the actual Boss Kills or Floors achieved.`)
        .setColor(0x8b5cf6);

      const firstAttachment = message.attachments.first();
      if (firstAttachment && firstAttachment.contentType?.startsWith('image/')) {
        embed.setThumbnail(firstAttachment.url);
      }

      const sentMessage = await (message.channel as any).send({
        content: `<@${user.id}>`,
        embeds: [embed],
        components: [row]
      });

      // Auto-expiry timeout (1 minute) if no interaction occurs
      setTimeout(async () => {
        try {
          // 1. Delete the temporary button message
          await sentMessage.delete().catch(() => {});

          // 2. Fetch the fresh original message and remove the admin's 🧮 reaction
          const freshMessage = await message.channel.messages.fetch(message.id).catch(() => null);
          if (freshMessage) {
            const abacusReaction = freshMessage.reactions.cache.find(r => r.emoji.name === '🧮');
            if (abacusReaction) {
              await abacusReaction.users.remove(user.id).catch(() => {});
            }
          }
        } catch (err) {
          // Safe ignore if already deleted or cleaned up
        }
      }, 60000);

      return;
    } catch (error) {
      console.error(error);
    }
  }

  // ---------------------------------------------------------
  // 2. QUICK DIRECT VERIFICATION (✅)
  // ---------------------------------------------------------
  if (reaction.emoji.name === '✅') {
    const devChannelId = process.env['PROGRESSION_CHECK_ID_DEVELOPER'];
    const officialChannelId = process.env['PROGRESSION_CHECK_ID'];
    
    // Only allow in designated channels
    if (message.channelId !== devChannelId && message.channelId !== officialChannelId) return;

    // 1. Restrict to Grimex and authorized Admins (including user ID)
    const isAuthorized = adminIds.includes(user.id) || user.username.toLowerCase().includes('grimex');
    if (!isAuthorized) {
      const channel: any = message.channel;
      const warningMsg = await channel.send(`❌ <@${user.id}>, only authorized Admins are permitted to verify progressions using the ✅ reaction!`);
      setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
      await reaction.users.remove(user.id).catch(() => {});
      return;
    }

    try {
      const member = await prisma.member.findUnique({ where: { discordId: author.id } });
      if (!member) return;

      const activeCheck = await prisma.progressionCheck.findFirst({
        where: { deletedAt: null, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      });
      if (!activeCheck) return;

      // 2. Prevent duplicate notification due to rapid duplicate events
      const lockKey = `${activeCheck.id}_${member.id}`;
      if (progressionLocks.has(lockKey)) return;
      progressionLocks.add(lockKey);

      const existingStatus = await prisma.memberProgressionStatus.findUnique({
        where: {
          progressionCheckId_memberId: {
            progressionCheckId: activeCheck.id,
            memberId: member.id
          }
        }
      });

      if (existingStatus && existingStatus.isCompleted) {
        // Already verified! Don't process or send notification again.
        progressionLocks.delete(lockKey);
        return;
      }

      const req = await prisma.progressionRequirement.findFirst({
        where: { progressionCheckId: activeCheck.id }
      });
      const isMines = activeCheck.title.toLowerCase().includes('mine') || activeCheck.title.toLowerCase().includes('floor');
      const unit = isMines ? 'Floor' : 'Kills';
      const targetVal = req?.targetValue || (isMines ? '200' : '100');
      const note = `${unit}: ${targetVal}`;

      const status = await prisma.memberProgressionStatus.upsert({
        where: {
          progressionCheckId_memberId: {
            progressionCheckId: activeCheck.id,
            memberId: member.id
          }
        },
        update: {
          isCompleted: true,
          completedAt: new Date(),
          note
        },
        create: {
          progressionCheckId: activeCheck.id,
          memberId: member.id,
          isCompleted: true,
          completedAt: new Date(),
          note
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
          await (channel as any).send(`🔔 **${member.nickname}**, you've successfully completed the progression check of **${activeCheck.title}**!\n⏰ *Verified at: ${timestamp} (GMT+7)*`);
        }
      }
      
      // Release lock after 5 seconds
      setTimeout(() => progressionLocks.delete(lockKey), 5000);
    } catch (error) {
      console.error('Progression Error:', error);
      // Ensure lock is released on error too
      // (Depends on if lockKey is defined, but we are inside the same function block)
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

      const imageAttachments = message.attachments.filter(att => att.contentType?.startsWith('image/'));
      const imageCount = imageAttachments.size;
      const imgHeader = buildImageHeader(imageAttachments);
      const categoryRows = PointWizardService.buildCategoryRows(member.id, message.id);
      const effectiveTotal = Math.min(imageCount, 5);

      console.log(`[Wizard] Triggered by ${user.username}. Detected ${imageCount} images from ${author.username}`);

      await message.reply({
        content: `${imgHeader}\nHey <@${user.id}>, please select the point category for **${member.nickname}** (Image 1/${effectiveTotal}):`,
        components: categoryRows,
        allowedMentions: { repliedUser: false }
      });

    } catch (error) {
      console.error('Points Wizard Error:', error);
    }
    return;
  }

  // ---------------------------------------------------------
  // 3. MINES EQUIP DROPS TRACKING (✅ or ⛏️)
  // ---------------------------------------------------------
  const isMinesEmoji = reaction.emoji.name === '✅' || reaction.emoji.name === '⛏️' || reaction.emoji.name === '⛏';
  if (isMinesEmoji) {
    try {
      const MINES_DROPS_CHANNEL_ID = '1265850153517060096';
      const minesChannelId = process.env['MINES_DROPS_CHANNEL_ID'] || MINES_DROPS_CHANNEL_ID;
      const channel = message.channel;
      const channelName = channel && 'name' in channel ? (channel as any).name : '';
      const isMinesChannel =
        message.channelId === minesChannelId ||
        message.channelId === MINES_DROPS_CHANNEL_ID ||
        channelName.toLowerCase().includes('mines-drops') ||
        message.channelId === process.env['TEST_CHANNEL_ID'];

      if (!isMinesChannel) return;

      // Strictly restrict to user (Bahan) and Grimex
      const MINES_AUTHORIZED_IDS = ['152989780274184192', '517740134440075274'];
      const isMinesAuthorized =
        MINES_AUTHORIZED_IDS.includes(user.id) ||
        (user.username ? user.username.toLowerCase().includes('grimex') : false);

      if (!isMinesAuthorized) {
        await reaction.users.remove(user.id).catch(() => {});
        return;
      }

      // Verify that message contains image/media attachments or embeds
      const hasMedia = message.attachments.some(att => att.contentType?.startsWith('image/')) || message.attachments.size > 0;
      if (!hasMedia) return;

      // Ensure member exists
      const member = await MemberService.ensureMemberExists(author, message.guild);

      // Record drop
      const result = await MinesDropService.recordReactionDrop(member.id, user.id, message.id);
      if (result.success) {
        // Add diamond reaction to indicate verified drop count
        await message.react('💎').catch(() => null);
      }
    } catch (error) {
      console.error('Mines Drop Reaction Error:', error);
    }
    return;
  }
}
