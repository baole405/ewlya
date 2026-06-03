import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from 'discord.js';
import { prisma } from '../../database/prisma';
import { LoggerService } from './logger.service';
import { CategoryKey, getOptionById, POINT_CONFIG } from './point-calculator.service';
import { addItemToCart, buildCartBackContent, buildCartMessage, calcTotalFromList, extractDetectedImages, extractTotalImages, parseCartFromContent, removeItemFromCart } from '../utils/cart.utils';


export class PointWizardService {
  /**
   * Handles button interactions starting with calc_cat_
   */
  static async handleCategorySelection(interaction: ButtonInteraction) {
    if (process.env['IS_LOCAL_BOT'] !== 'true') return;
    const parts = interaction.customId.split('_');
    const category = parts[2]; // 'crest' or 'ldb'
    const targetMemberId = parts[3];
    const messageId = parts[4] || ''; // Might be undefined if from an older button

    const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ Only admins can use this.', flags: [MessageFlags.Ephemeral] });
    }

    const detected = extractDetectedImages(interaction.message.content);
    const prefix = detected ? `${detected}\n\n` : '';

    if (category === 'crest') {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`calc_final_crest_4plus_${targetMemberId}_${messageId}`)
          .setLabel('4+ (8 pts)')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`calc_final_crest_burst_${targetMemberId}_${messageId}`)
          .setLabel('Burst (20 pts)')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`calc_back_main_${targetMemberId}_${messageId}`)
          .setLabel('⬅️ Back')
          .setStyle(ButtonStyle.Secondary),
      );

      const cart = parseCartFromContent(interaction.message.content);
      const totalImg = extractTotalImages(interaction.message.content);
      const imgIdx = cart.length + 1;
      const progress = totalImg > 0 ? ` (Image ${imgIdx}/${totalImg})` : '';

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `💎 **Crest Selected.** Choose the tier:${progress}`),
        components: [row],
      });
    }

    if (category === 'sreq') {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`calc_final_sreq_eq_rep_${targetMemberId}_${messageId}`)
          .setLabel('Rep (5 pts)')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`calc_final_sreq_eq_custom_${targetMemberId}_${messageId}`)
          .setLabel('Custom (20 pts)')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`calc_back_main_${targetMemberId}_${messageId}`)
          .setLabel('⬅️ Back')
          .setStyle(ButtonStyle.Secondary),
      );

      const cart = parseCartFromContent(interaction.message.content);
      const totalImg = extractTotalImages(interaction.message.content);
      const imgIdx = cart.length + 1;
      const progress = totalImg > 0 ? ` (Image ${imgIdx}/${totalImg})` : '';

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `🛠️ **SR's EQ Selected.** Choose the type:${progress}`),
        components: [row],
      });
    }

    if (category === 'ldb') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`calc_ldb_stage_${targetMemberId}_${messageId}`)
        .setPlaceholder('Select Leaderboard Stage')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Summoner Road')
            .setValue('LB_SUMMONER_ROAD'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Spex,AWK,Challenge (and up)')
            .setValue('LB_SPEX'),
          new StringSelectMenuOptionBuilder().setLabel('EX2, EX1, EX, Ruins 1-5').setValue('LB_EX'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Blue Stage / No Prefix')
            .setValue('LB_BLUE'),
        );
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

      const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`calc_back_main_${targetMemberId}_${messageId}`)
          .setLabel('⬅️ Back')
          .setStyle(ButtonStyle.Secondary),
      );

      const cart = parseCartFromContent(interaction.message.content);
      const totalImg = extractTotalImages(interaction.message.content);
      const imgIdx = cart.length + 1;
      const progress = totalImg > 0 ? ` (Image ${imgIdx}/${totalImg})` : '';

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `🏆 **Leaderboard Selected.** Choose the stage:${progress}`),
        components: [row, backRow],
      });
    }
  }

  /**
   * Handles Leaderboard stage selection (shows rank menu)
   */
  static async handleStageSelection(interaction: StringSelectMenuInteraction) {
    if (process.env['IS_LOCAL_BOT'] !== 'true') return;
    const parts = interaction.customId.split('_');
    const targetMemberId = parts[3];
    const messageId = parts[4] || '';

    const stageKey = interaction.values[0] as CategoryKey;
    const stageConfig = POINT_CONFIG[stageKey];

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`calc_final_ldb_${stageKey}_${targetMemberId}_${messageId}`)
      .setPlaceholder(`Select Rank for ${stageConfig.label}`)
      .addOptions(
        stageConfig.options.map((opt) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${opt.label} (${opt.points} pts)`)
            .setValue(opt.id),
        ),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`calc_back_ldb_${targetMemberId}_${messageId}`)
        .setLabel('⬅️ Back to Stages')
        .setStyle(ButtonStyle.Secondary),
    );

    const detected = extractDetectedImages(interaction.message.content);
    const prefix = detected ? `${detected}\n\n` : '';

    const cart = parseCartFromContent(interaction.message.content);
    const totalImg = extractTotalImages(interaction.message.content);
    const imgIdx = cart.length + 1;
    const progress = totalImg > 0 ? ` (Image ${imgIdx}/${totalImg})` : '';

    return interaction.update({
      content: buildCartBackContent(interaction.message.content, `🏆 Stage: **${stageConfig.label}**. Now select the rank:${progress}`),
      components: [row, backRow],
    });
  }

  /**
   * Handles the final point awarding logic for both Crests and Leaderboards
   */
  static async handleFinalSelection(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    if (process.env['IS_LOCAL_BOT'] !== 'true') return;
    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map((id) => id.trim());
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ Only admins can use this.', flags: [MessageFlags.Ephemeral] });
    }

    await interaction.deferUpdate();

    let pointsToAdd = 0;
    let missionText = '';
    let targetMemberId = '';
    let originalMessageId = '';

    const parts = interaction.customId.split('_');
    // For both buttons and menus, messageId is the last part, targetMemberId is second to last
    originalMessageId = parts.pop() || '';
    targetMemberId = parts.pop() || '';

    if (interaction.isButton()) {
      const optionId = parts[3] + (parts[4] ? '_' + parts[4] : ''); // Handles 'eq_rep', 'eq_custom', '4plus', etc.
      const type = parts[2]; // 'crest' or 'sreq'

      const catKey = type === 'crest' ? 'CRESTS' : 'SR_EQ';
      const option = getOptionById(catKey, optionId);
      pointsToAdd = option?.points || 0;
      missionText = `${type.toUpperCase()}: ${option?.label}`;
    } else if (interaction.isStringSelectMenu()) {
      const stageKey = parts.slice(3).join('_');
      const rankId = interaction.values[0];

      if (!stageKey || !(stageKey in POINT_CONFIG)) {
        return interaction.editReply({ content: '❌ Invalid or expired interaction. Please use the command again to start a new Point Wizard.', components: [] });
      }

      const option = getOptionById(stageKey as CategoryKey, rankId);
      pointsToAdd = option?.points || 0;
      missionText = `LDB: ${POINT_CONFIG[stageKey as CategoryKey].label} (${option?.label})`;
    }

    // --- SHOPPING CART LOGIC ---
    const existingContent = interaction.message.content;
    const pendingMatch = existingContent.match(/📜\s*(?:\*\*)?Pending Rewards:(?:\*\*)?\s*\n([\s\S]*?)(\n\n|$)/i);
    let pendingList = pendingMatch ? pendingMatch[1].trim() : '';

    pendingList = addItemToCart(pendingList, { mission: missionText, points: pointsToAdd });
    const totalPoints = calcTotalFromList(pendingList);
    const totalImages = extractTotalImages(existingContent);
    const currentCount = parseCartFromContent(buildCartMessage(pendingList)).length;

    // Auto-loop logic
    if (totalImages > 0 && currentCount < totalImages) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`calc_cat_crest_${targetMemberId}_${originalMessageId}`).setLabel('💎 Crest').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`calc_cat_ldb_${targetMemberId}_${originalMessageId}`).setLabel('🏆 Leaderboard').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`calc_cat_sreq_${targetMemberId}_${originalMessageId}`).setLabel("🛠️ SR's EQ").setStyle(ButtonStyle.Success)
      );

      const nextIdx = currentCount + 1;
      const progress = ` for **Image ${nextIdx}/${totalImages}**`;

      return interaction.editReply({
        content: buildCartBackContent(buildCartMessage(pendingList, existingContent), `📌 Select the next reward category${progress}:`),
        components: [row],
      });
    }

    // Final step: Review & Save
    const reviewRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`calc_back_main_${targetMemberId}_${originalMessageId}`).setLabel('➕ Add More').setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`calc_confirm_save_${targetMemberId}_${originalMessageId}`)
        .setLabel(`✅ Confirm & Save (${totalPoints} pts)`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`calc_edit_list_${targetMemberId}_${originalMessageId}`)
        .setLabel('✏️ Edit Items')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`calc_cancel_${originalMessageId}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Danger),
    );

    return interaction.editReply({
      content: buildCartMessage(pendingList, existingContent),
      components: [reviewRow],
    });
  }

  /**
   * Handles Save to DB
   */
  static async handleConfirmSave(interaction: ButtonInteraction) {
    if (process.env['IS_LOCAL_BOT'] !== 'true') return;
    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map((id) => id.trim());
    if (!adminIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ No permission', flags: [MessageFlags.Ephemeral] });

    await interaction.deferUpdate();
    const parts = interaction.customId.split('_');
    const targetMemberId = parts[3];
    const originalMessageId = parts[4] || '';

    try {
      const member = await prisma.member.findUnique({ where: { id: targetMemberId } });
      if (!member) throw new Error('Member data missing');

      // 1. Fetch original message to get its creation date
      let msgDate = new Date();
      if (originalMessageId && interaction.channel) {
        const originalMsg = await interaction.channel.messages.fetch(originalMessageId).catch(() => null);
        if (originalMsg) msgDate = originalMsg.createdAt;
      }

      // 2. Find the season that covers the message date
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
        throw new Error(`No season found for ${monthName} ${year}. Please create it first.`);
      }

      const cartItems = parseCartFromContent(interaction.message.content);
      if (cartItems.length === 0) throw new Error('Cart empty');

      const total = cartItems.reduce((s, i) => s + i.points, 0);
      const subs = cartItems.map(i => ({
        memberId: member.id, points: i.points, mission: i.mission,
        reason: 'Batch', verifiedBy: interaction.user.id, seasonId: targetSeason!.id,
      }));

      await prisma.$transaction([
        prisma.member.update({ where: { id: member.id }, data: { points: { increment: total } } }),
        prisma.submission.createMany({ data: subs as any }),
      ]);

      for (const item of cartItems) {
        await LoggerService.logPoints(interaction.client, {
          memberNickname: member.nickname,
          memberDiscordId: member.discordId || undefined,
          missionText: item.mission,
          points: item.points,
          seasonName: targetSeason.name,
          adminUsername: interaction.user.username
        }).catch((err) => console.error('Failed to log point wizard item:', err));
      }

      await interaction.editReply({ content: `✅ Awarded **${total} points** to **${member.nickname}**.\n*(Auto-delete in 1 min)*`, components: [] });
      setTimeout(() => interaction.deleteReply().catch(() => null), 60000);

      if (originalMessageId && interaction.channel) {
        const originalMsg = await interaction.channel.messages.fetch(originalMessageId).catch(() => null);
        if (originalMsg) {
          await originalMsg.react('✅');
          const abacus = originalMsg.reactions.cache.find(r => r.emoji.name === '🧮' || r.emoji.name === '🔢');
          if (abacus) await abacus.users.remove(interaction.user.id).catch(() => null);
        }
      }
    } catch (e: any) {
      await interaction.editReply({ content: `❌ Error: ${e.message}`, components: [] });
    }
  }

  /**
   * Handles Back button
   */
  static async handleBack(interaction: ButtonInteraction) {
    if (process.env['IS_LOCAL_BOT'] !== 'true') return;
    const parts = interaction.customId.split('_');
    const backTarget = parts[2];
    const targetMemberId = parts[3];
    const messageId = parts[4] || '';

    if (backTarget === 'main') {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`calc_cat_crest_${targetMemberId}_${messageId}`).setLabel('💎 Crest').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`calc_cat_ldb_${targetMemberId}_${messageId}`).setLabel('🏆 Leaderboard').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`calc_cat_sreq_${targetMemberId}_${messageId}`).setLabel("🛠️ SR's EQ").setStyle(ButtonStyle.Success),
      );
      const cart = parseCartFromContent(interaction.message.content);
      const totalImg = extractTotalImages(interaction.message.content);
      const imgIdx = cart.length + 1;
      const progress = totalImg > 0 ? ` for **Image ${imgIdx}/${totalImg}**` : '';

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `📌 Select the next reward category${progress}:`),
        components: [row],
      });
    }

    if (backTarget === 'ldb') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`calc_ldb_stage_${targetMemberId}_${messageId}`)
        .setPlaceholder('Select Leaderboard Stage')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Summoner Road')
            .setValue('LB_SUMMONER_ROAD'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Spex,AWK,Challenge (and up)')
            .setValue('LB_SPEX'),
          new StringSelectMenuOptionBuilder().setLabel('EX2, EX1, EX, Ruins 1-5').setValue('LB_EX'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Blue Stage / No Prefix')
            .setValue('LB_BLUE'),
        );
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

      const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`calc_back_main_${targetMemberId}_${messageId}`)
          .setLabel('⬅️ Back')
          .setStyle(ButtonStyle.Secondary),
      );

      const cart = parseCartFromContent(interaction.message.content);
      const totalImg = extractTotalImages(interaction.message.content);
      const imgIdx = cart.length + 1;
      const progress = totalImg > 0 ? ` (Image ${imgIdx}/${totalImg})` : '';

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `🏆 **Leaderboard Selected.** Choose the stage:${progress}`),
        components: [row, backRow],
      });
    }
  }

  static async handleCancel(interaction: ButtonInteraction) {
    if (process.env['IS_LOCAL_BOT'] !== 'true') return;
    const parts = interaction.customId.split('_');
    const messageId = parts[2];

    if (messageId && interaction.channel) {
      const originalMsg = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (originalMsg) {
        const abacus = originalMsg.reactions.cache.find(r => r.emoji.name === '🧮' || r.emoji.name === '🔢');
        if (abacus) await abacus.users.remove(interaction.user.id).catch(() => null);
      }
    }

    return interaction.message.delete().catch(() => null);
  }

  static async handleEditList(interaction: ButtonInteraction) {
    if (process.env['IS_LOCAL_BOT'] !== 'true') return;
    const parts = interaction.customId.split('_');
    const targetMemberId = parts[3];
    const originalMessageId = parts[4];

    const cart = parseCartFromContent(interaction.message.content);
    if (cart.length === 0) return interaction.reply({ content: 'Cart is empty.', flags: [MessageFlags.Ephemeral] });

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`calc_item_edit_menu_${targetMemberId}_${originalMessageId}`)
      .setPlaceholder('Select an item to edit (it will be removed)')
      .addOptions(
        cart.map((item, idx) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${idx + 1}. ${item.mission}`)
            .setValue(idx.toString())
            .setDescription(`+${item.points} pts`)
        )
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`calc_back_to_cart_${targetMemberId}_${originalMessageId}`)
        .setLabel('⬅️ Back to Cart')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.update({
      content: buildCartBackContent(interaction.message.content, '✏️ **Select an item to edit.**\n*Note: The item will be removed and you will re-select points for it.*'),
      components: [row, backRow],
    });
  }

  static async handleSelectItemToEdit(interaction: StringSelectMenuInteraction) {
    const parts = interaction.customId.split('_');
    const targetMemberId = parts[4];
    const originalMessageId = parts[5];
    const indexToEdit = parseInt(interaction.values[0]);

    const pendingMatch = interaction.message.content.match(/📜\s*(?:\*\*)?Pending Rewards:(?:\*\*)?\s*\n([\s\S]*?)(\n\n|$)/i);
    let pendingList = pendingMatch ? pendingMatch[1].trim() : '';

    pendingList = removeItemFromCart(pendingList, indexToEdit);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`calc_cat_crest_${targetMemberId}_${originalMessageId}`).setLabel('💎 Crest').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`calc_cat_ldb_${targetMemberId}_${originalMessageId}`).setLabel('🏆 Leaderboard').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`calc_cat_sreq_${targetMemberId}_${originalMessageId}`).setLabel("🛠️ SR's EQ").setStyle(ButtonStyle.Success)
    );

    const totalImg = extractTotalImages(interaction.message.content);
    const cart = parseCartFromContent(buildCartMessage(pendingList));
    const nextIdx = cart.length + 1;
    const progress = totalImg > 0 ? ` for **Image ${nextIdx}/${totalImg}**` : '';

    return interaction.update({
      content: buildCartBackContent(buildCartMessage(pendingList, interaction.message.content), `📌 Re-selecting points${progress}:`),
      components: [row],
    });
  }

  static async handleBackToCart(interaction: ButtonInteraction) {
    const pendingMatch = interaction.message.content.match(/📜\s*(?:\*\*)?Pending Rewards:(?:\*\*)?\s*\n([\s\S]*?)(\n\n|$)/i);
    const pendingList = pendingMatch ? pendingMatch[1].trim() : '';

    const parts = interaction.customId.split('_');
    const targetMemberId = parts[4];
    const originalMessageId = parts[5];
    const totalPoints = calcTotalFromList(pendingList);

    const reviewRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`calc_back_main_${targetMemberId}_${originalMessageId}`).setLabel('➕ Add More').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`calc_confirm_save_${targetMemberId}_${originalMessageId}`).setLabel(`✅ Confirm & Save (${totalPoints} pts)`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`calc_edit_list_${targetMemberId}_${originalMessageId}`).setLabel('✏️ Edit Items').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`calc_cancel_${originalMessageId}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
    );

    return interaction.update({
      content: buildCartMessage(pendingList, interaction.message.content),
      components: [reviewRow],
    });
  }
}
