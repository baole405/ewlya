import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { prisma } from '../../database/prisma';
import { LoggerService } from './logger.service';
import { CategoryKey, getOptionById, POINT_CONFIG } from './point-calculator.service';
import { addItemToCart, buildCartBackContent, buildCartMessage, calcTotalFromList, countProcessedImages, extractDetectedImages, extractTotalImages, getPendingListFromContent, parseCartFromContent, removeItemFromCart } from '../utils/cart.utils';

export class PointWizardService {
  /**
   * Helper method to build category action rows for main selection menu.
   * Row 1: Crest, Leaderboard, Mines, Raids
   * Row 2: Challenges, SR's EQ, Custom Points, Cancel
   */
  static buildCategoryRows(targetMemberId: string, messageId: string): ActionRowBuilder<ButtonBuilder>[] {
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`calc_cat_crest_${targetMemberId}_${messageId}`).setLabel('💎 Crest').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`calc_cat_ldb_${targetMemberId}_${messageId}`).setLabel('🏆 Leaderboard').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`calc_cat_mines_${targetMemberId}_${messageId}`).setLabel('⛏️ Mines').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`calc_cat_raids_${targetMemberId}_${messageId}`).setLabel('⚔️ Raids').setStyle(ButtonStyle.Primary),
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`calc_cat_chal_${targetMemberId}_${messageId}`).setLabel('🎯 Challenges').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`calc_cat_sreq_${targetMemberId}_${messageId}`).setLabel("🛠️ SR's EQ").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`calc_cat_custom_${targetMemberId}_${messageId}`).setLabel('➕ Custom Points').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`calc_cancel_${messageId}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Danger),
    );

    return [row1, row2];
  }

  /**
   * Handles button interactions starting with calc_cat_
   */
  static async handleCategorySelection(interaction: ButtonInteraction) {
    const parts = interaction.customId.split('_');
    const category = parts[2];
    const targetMemberId = parts[3];
    const messageId = parts[4] || '';

    const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ Only admins can use this.', flags: [MessageFlags.Ephemeral] });
    }

    const cart = parseCartFromContent(interaction.message.content);
    const rawTotalImg = extractTotalImages(interaction.message.content);
    const effectiveTotalImg = Math.min(rawTotalImg, 5);
    const imgIdx = cart.length + 1;
    const progress = effectiveTotalImg > 0 ? ` (Image ${imgIdx}/${effectiveTotalImg})` : '';

    if (category === 'crest') {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`calc_final_crest_4plus_${targetMemberId}_${messageId}`).setLabel('4+ (8 pts)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`calc_final_crest_burst_${targetMemberId}_${messageId}`).setLabel('Burst (20 pts)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`calc_final_crest_zero_${targetMemberId}_${messageId}`).setLabel('0 (0 pts)').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`calc_back_main_${targetMemberId}_${messageId}`).setLabel('Back').setStyle(ButtonStyle.Secondary),
      );

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `💎 **Crest:**`),
        components: [row],
      });
    }

    if (category === 'sreq') {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`calc_final_sreq_eq_rep_${targetMemberId}_${messageId}`).setLabel('Rep (5 pts)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`calc_final_sreq_eq_custom_${targetMemberId}_${messageId}`).setLabel('Custom (20 pts)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`calc_final_sreq_eq_zero_${targetMemberId}_${messageId}`).setLabel('0 (0 pts)').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`calc_back_main_${targetMemberId}_${messageId}`).setLabel('Back').setStyle(ButtonStyle.Secondary),
      );

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `🛠️ **SR's EQ:**`),
        components: [row],
      });
    }

    if (category === 'ldb') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`calc_ldb_stage_${targetMemberId}_${messageId}`)
        .setPlaceholder('Stage')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Spex or Higher / Ruins 6-16F').setValue('LB_SPEX'),
          new StringSelectMenuOptionBuilder().setLabel('EX2 & Lower').setValue('LB_EX'),
          new StringSelectMenuOptionBuilder().setLabel('Blue Stage / Ruins 1-5F').setValue('LB_BLUE'),
          new StringSelectMenuOptionBuilder().setLabel('Summoner Road').setValue('LB_SUMMONER_ROAD'),
        );
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
      const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`calc_back_main_${targetMemberId}_${messageId}`).setLabel('Back').setStyle(ButtonStyle.Secondary),
      );

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `🏆 **Leaderboard:**`),
        components: [row, backRow],
      });
    }

    if (category === 'mines') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`calc_final_ldb_MINES_${targetMemberId}_${messageId}`)
        .setPlaceholder('Floor')
        .addOptions(
          POINT_CONFIG.MINES.options.map(opt =>
            new StringSelectMenuOptionBuilder().setLabel(`${opt.label} (${opt.points} pts)`).setValue(opt.id)
          )
        );
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
      const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`calc_back_main_${targetMemberId}_${messageId}`).setLabel('Back').setStyle(ButtonStyle.Secondary),
      );

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `⛏️ **Mines:**`),
        components: [row, backRow],
      });
    }

    if (category === 'raids') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`calc_final_ldb_RAIDS_${targetMemberId}_${messageId}`)
        .setPlaceholder('Rank')
        .addOptions(
          POINT_CONFIG.RAIDS.options.map(opt =>
            new StringSelectMenuOptionBuilder().setLabel(`${opt.label} (${opt.points} pts)`).setValue(opt.id)
          )
        );
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
      const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`calc_back_main_${targetMemberId}_${messageId}`).setLabel('Back').setStyle(ButtonStyle.Secondary),
      );

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `⚔️ **Raids:**`),
        components: [row, backRow],
      });
    }

    if (category === 'chal') {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`calc_final_chal_chal_max_${targetMemberId}_${messageId}`).setLabel('Max (20 pts)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`calc_final_chal_chal_min_${targetMemberId}_${messageId}`).setLabel('Min (5 pts)').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`calc_back_main_${targetMemberId}_${messageId}`).setLabel('Back').setStyle(ButtonStyle.Secondary),
      );

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `🎯 **Challenges:**`),
        components: [row],
      });
    }

    if (category === 'custom') {
      const rawTotalImages = extractTotalImages(interaction.message.content);
      const modal = new ModalBuilder()
        .setCustomId(`calc_custom_modal_${targetMemberId}_${messageId}`)
        .setTitle('Add Custom Points');

      const pointsInput = new TextInputBuilder()
        .setCustomId('custom_points')
        .setLabel('Points amount')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 25 or -10')
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('custom_reason')
        .setLabel('Reason / Mission description')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Special Event Bonus')
        .setRequired(true);

      const qtyInput = new TextInputBuilder()
        .setCustomId('custom_qty')
        .setLabel(`Image count / Quantity (1 - ${rawTotalImages || 99})`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 18 or 1')
        .setValue(String(rawTotalImages || 1))
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(pointsInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(qtyInput),
      );

      await interaction.showModal(modal);
      return;
    }
  }
  /**
   * Handles button interactions for quantity choices (calc_qtyapply_)
   */
  static async handleQuantityChoice(interaction: ButtonInteraction) {
    const parts = interaction.customId.split('_');
    // Format: calc_qtyapply_[mode]_[catKey]_[optId]_[targetMemberId]_[originalMessageId]
    const mode = parts[2]; // 'all', '1', or 'custom'
    const catKey = parts[3] as CategoryKey;
    const optId = parts[4];
    const targetMemberId = parts[5];
    const originalMessageId = parts[6] || '';

    const existingContent = interaction.message.content;
    const rawTotalImages = extractTotalImages(existingContent);
    const processedImages = countProcessedImages(existingContent);
    const remainingImages = Math.max(0, rawTotalImages - processedImages);

    const option = getOptionById(catKey, optId);
    const points = option?.points || 0;
    const label = option?.label || optId;
    const catLabel = POINT_CONFIG[catKey]?.label || catKey;
    const missionText = `${catLabel}: ${label}`;

    if (mode === 'custom') {
      const modal = new ModalBuilder()
        .setCustomId(`calc_qty_modal_${catKey}_${optId}_${targetMemberId}_${originalMessageId}`)
        .setTitle('Enter Image Quantity');

      const qtyInput = new TextInputBuilder()
        .setCustomId('qty_input')
        .setLabel(`Images for this reward (1 - ${remainingImages || rawTotalImages || 99})`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`e.g., ${remainingImages || rawTotalImages || 1}`)
        .setValue(String(remainingImages || 1))
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(qtyInput));
      await interaction.showModal(modal);
      return;
    }

    await interaction.deferUpdate();

    const count = mode === 'all' ? Math.max(1, remainingImages) : 1;
    return this.processAddedItem(interaction, targetMemberId, originalMessageId, missionText, points, count);
  }

  /**
   * Handles Modal submit for Custom Quantity (calc_qty_modal_)
   */
  static async handleQuantityModalSubmit(interaction: ModalSubmitInteraction) {
    const parts = interaction.customId.split('_');
    const catKey = parts[3] as CategoryKey;
    const optId = parts[4];
    const targetMemberId = parts[5];
    const originalMessageId = parts[6] || '';

    const qtyStr = interaction.fields.getTextInputValue('qty_input').trim();
    const count = parseInt(qtyStr, 10);

    if (isNaN(count) || count <= 0) {
      return interaction.reply({ content: '❌ Please enter a valid positive number for image quantity.', flags: [MessageFlags.Ephemeral] });
    }

    await interaction.deferUpdate();

    const option = getOptionById(catKey, optId);
    const points = option?.points || 0;
    const label = option?.label || optId;
    const catLabel = POINT_CONFIG[catKey]?.label || catKey;
    const missionText = `${catLabel}: ${label}`;

    return this.processAddedItem(interaction, targetMemberId, originalMessageId, missionText, points, count);
  }

  /**
   * Handles Leaderboard stage selection (shows rank menu)
   */
  static async handleStageSelection(interaction: StringSelectMenuInteraction) {
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
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary),
    );

    return interaction.update({
      content: buildCartBackContent(interaction.message.content, `🏆 **${stageConfig.label}:**`),
      components: [row, backRow],
    });
  }

  /**
   * Handles modal submission for custom points input
   */
  static async handleCustomModalSubmit(interaction: ModalSubmitInteraction) {
    const parts = interaction.customId.split('_');
    const targetMemberId = parts[3];
    const originalMessageId = parts[4] || '';

    const pointsStr = interaction.fields.getTextInputValue('custom_points');
    const reasonStr = interaction.fields.getTextInputValue('custom_reason');
    const qtyStr = interaction.fields.components.length >= 3 ? interaction.fields.getTextInputValue('custom_qty') : '1';
    
    const pointsToAdd = parseInt(pointsStr, 10);
    const count = parseInt(qtyStr, 10) || 1;

    if (isNaN(pointsToAdd)) {
      return interaction.reply({ content: '❌ Please enter a valid number for points.', flags: [MessageFlags.Ephemeral] });
    }

    await interaction.deferUpdate();

    const missionText = `CUSTOM: ${reasonStr}`;
    return this.processAddedItem(interaction, targetMemberId, originalMessageId, missionText, pointsToAdd, Math.max(1, count));
  }

  /**
   * Handles the final point awarding logic for both Crests, Leaderboards, Mines, Raids, and Challenges
   */
  static async handleFinalSelection(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map((id) => id.trim());
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ Only admins can use this.', flags: [MessageFlags.Ephemeral] });
    }

    let pointsToAdd = 0;
    let missionText = '';
    let targetMemberId = '';
    let originalMessageId = '';
    let catKey: CategoryKey = 'CRESTS';
    let optionId = '';

    const parts = interaction.customId.split('_');
    originalMessageId = parts.pop() || '';
    targetMemberId = parts.pop() || '';

    if (interaction.isButton()) {
      const type = parts[2]; // 'crest', 'sreq', or 'chal'
      optionId = parts.slice(3).join('_'); // e.g. 'eq_rep', '4plus', 'chal_max'

      if (type === 'crest') {
        catKey = 'CRESTS';
        const option = getOptionById(catKey, optionId);
        pointsToAdd = option?.points || 0;
        missionText = `💎 Crests: ${option?.label}`;
      } else if (type === 'sreq') {
        catKey = 'SR_EQ';
        const option = getOptionById(catKey, optionId);
        pointsToAdd = option?.points || 0;
        missionText = `🛠️ SR's EQ: ${option?.label}`;
      } else if (type === 'chal') {
        catKey = 'CHALLENGES';
        const option = getOptionById(catKey, optionId);
        pointsToAdd = option?.points || 0;
        missionText = `🎯 Challenges: ${option?.label}`;
      }
    } else if (interaction.isStringSelectMenu()) {
      catKey = parts.slice(3).join('_') as CategoryKey;
      optionId = interaction.values[0];

      if (!catKey || !(catKey in POINT_CONFIG)) {
        return interaction.reply({ content: '❌ Invalid or expired interaction.', flags: [MessageFlags.Ephemeral] });
      }

      const option = getOptionById(catKey, optionId);
      pointsToAdd = option?.points || 0;
      missionText = `${POINT_CONFIG[catKey].label}: ${option?.label}`;
    }

    const rawTotalImages = extractTotalImages(interaction.message.content);
    const processedImages = countProcessedImages(interaction.message.content);
    const remainingImages = Math.max(0, rawTotalImages - processedImages);

    // If multiple remaining media (>1), offer Quantity Choice prompt
    if (remainingImages > 1) {
      const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`calc_qtyapply_all_${catKey}_${optionId}_${targetMemberId}_${originalMessageId}`)
          .setLabel(`All (${remainingImages}x) (+${pointsToAdd * remainingImages} pts)`)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`calc_qtyapply_custom_${catKey}_${optionId}_${targetMemberId}_${originalMessageId}`)
          .setLabel('Custom Qty')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`calc_qtyapply_1_${catKey}_${optionId}_${targetMemberId}_${originalMessageId}`)
          .setLabel(`Single (1x) (+${pointsToAdd} pts)`)
          .setStyle(ButtonStyle.Secondary),
      );

      const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`calc_back_main_${targetMemberId}_${originalMessageId}`)
          .setLabel('Back')
          .setStyle(ButtonStyle.Secondary),
      );

      return interaction.update({
        content: buildCartBackContent(
          interaction.message.content,
          `**${missionText}** (+${pointsToAdd} pts each) — Quantity:`
        ),
        components: [row1, row2],
      });
    }

    await interaction.deferUpdate();
    return this.processAddedItem(interaction, targetMemberId, originalMessageId, missionText, pointsToAdd, 1);
  }

  /**
   * Core workflow helper after an item is selected or entered via modal.
   * Updates cart, handles remaining image progress tracking, or shows final review.
   */
  private static async processAddedItem(
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
    targetMemberId: string,
    originalMessageId: string,
    missionText: string,
    pointsToAdd: number,
    count: number = 1
  ) {
    const existingContent = interaction.message?.content || '';
    let pendingList = getPendingListFromContent(existingContent);

    pendingList = addItemToCart(pendingList, { mission: missionText, points: pointsToAdd }, count);
    const totalPoints = calcTotalFromList(pendingList);
    const updatedCartMessage = buildCartMessage(pendingList, existingContent);

    const rawTotalImages = extractTotalImages(existingContent);
    const processedImages = countProcessedImages(updatedCartMessage);
    const remainingImages = Math.max(0, rawTotalImages - processedImages);

    // Auto-advance logic: If there are still remaining un-scored media, prompt for next category!
    if (rawTotalImages > 0 && remainingImages > 0) {
      const categoryRows = this.buildCategoryRows(targetMemberId, originalMessageId);
      return interaction.editReply({
        content: buildCartBackContent(updatedCartMessage, `Select category:`),
        components: categoryRows,
      });
    }

    // Final Review & Save screen
    const reviewRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`calc_confirm_save_${targetMemberId}_${originalMessageId}`)
        .setLabel(`Confirm (+${totalPoints} pts)`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`calc_back_main_${targetMemberId}_${originalMessageId}`)
        .setLabel('Add More')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`calc_edit_list_${targetMemberId}_${originalMessageId}`)
        .setLabel('Edit')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`calc_cancel_${originalMessageId}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger),
    );

    return interaction.editReply({
      content: updatedCartMessage,
      components: [reviewRow],
    });
  }

  /**
   * Handles Save to DB
   */
  static async handleConfirmSave(interaction: ButtonInteraction) {
    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map((id) => id.trim());
    if (!adminIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ No permission', flags: [MessageFlags.Ephemeral] });

    await interaction.deferUpdate();
    const parts = interaction.customId.split('_');
    const targetMemberId = parts[3];
    const originalMessageId = parts[4] || '';

    try {
      const member = await prisma.member.findUnique({ where: { id: targetMemberId } });
      if (!member) throw new Error('Member data missing');

      let msgDate = new Date();
      let messageUrl: string | undefined = undefined;
      if (originalMessageId && interaction.channel) {
        const originalMsg = await interaction.channel.messages.fetch(originalMessageId).catch(() => null);
        if (originalMsg) {
          msgDate = originalMsg.createdAt;
          messageUrl = originalMsg.url;
        } else if (interaction.guildId && interaction.channelId) {
          messageUrl = `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${originalMessageId}`;
        }
      }

      let targetSeason = await prisma.season.findFirst({ where: { isActive: true } });
      if (!targetSeason) {
        targetSeason = await prisma.season.findFirst({ orderBy: { startDate: 'desc' } });
      }

      if (!targetSeason) {
        throw new Error(`No active season found in DB. Please start a season first using /season start.`);
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
        if (item.points === 0) continue;
        await LoggerService.logPoints(interaction.client, {
          memberNickname: member.nickname,
          memberDiscordId: member.discordId || undefined,
          missionText: item.mission,
          points: item.points,
          seasonName: targetSeason.name,
          adminUsername: interaction.user.username,
          messageUrl
        }).catch((err) => console.error('Failed to log point wizard item:', err));
      }

      await interaction.editReply({ content: `✅ Awarded **+${total} pts** to **${member.nickname}**.`, components: [] });
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
    const parts = interaction.customId.split('_');
    const backTarget = parts[2];
    const targetMemberId = parts[3];
    const messageId = parts[4] || '';

    if (backTarget === 'main') {
      const categoryRows = this.buildCategoryRows(targetMemberId, messageId);
      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `Select category:`),
        components: categoryRows,
      });
    }

    if (backTarget === 'ldb') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`calc_ldb_stage_${targetMemberId}_${messageId}`)
        .setPlaceholder('Stage')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Spex or Higher / Ruins 6-16F').setValue('LB_SPEX'),
          new StringSelectMenuOptionBuilder().setLabel('EX2 & Lower').setValue('LB_EX'),
          new StringSelectMenuOptionBuilder().setLabel('Blue Stage / Ruins 1-5F').setValue('LB_BLUE'),
          new StringSelectMenuOptionBuilder().setLabel('Summoner Road').setValue('LB_SUMMONER_ROAD'),
        );
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
      const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`calc_back_main_${targetMemberId}_${messageId}`).setLabel('Back').setStyle(ButtonStyle.Secondary),
      );

      return interaction.update({
        content: buildCartBackContent(interaction.message.content, `🏆 **Leaderboard:**`),
        components: [row, backRow],
      });
    }
  }

  static async handleCancel(interaction: ButtonInteraction) {
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
    const parts = interaction.customId.split('_');
    const targetMemberId = parts[3];
    const originalMessageId = parts[4];

    const cart = parseCartFromContent(interaction.message.content);
    if (cart.length === 0) return interaction.reply({ content: 'No items.', flags: [MessageFlags.Ephemeral] });

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`calc_item_edit_menu_${targetMemberId}_${originalMessageId}`)
      .setPlaceholder('Select item to remove')
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
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.update({
      content: buildCartBackContent(interaction.message.content, 'Select item to remove:'),
      components: [row, backRow],
    });
  }

  static async handleSelectItemToEdit(interaction: StringSelectMenuInteraction) {
    const parts = interaction.customId.split('_');
    const targetMemberId = parts[4];
    const originalMessageId = parts[5];
    const indexToEdit = parseInt(interaction.values[0], 10);

    let pendingList = getPendingListFromContent(interaction.message.content);
    pendingList = removeItemFromCart(pendingList, indexToEdit);
    const categoryRows = this.buildCategoryRows(targetMemberId, originalMessageId);

    return interaction.update({
      content: buildCartBackContent(buildCartMessage(pendingList, interaction.message.content), `Select category:`),
      components: categoryRows,
    });
  }

  static async handleBackToCart(interaction: ButtonInteraction) {
    const pendingList = getPendingListFromContent(interaction.message.content);

    const parts = interaction.customId.split('_');
    const targetMemberId = parts[4];
    const originalMessageId = parts[5];
    const totalPoints = calcTotalFromList(pendingList);

    const reviewRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`calc_confirm_save_${targetMemberId}_${originalMessageId}`)
        .setLabel(`Confirm (+${totalPoints} pts)`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`calc_back_main_${targetMemberId}_${originalMessageId}`)
        .setLabel('Add More')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`calc_edit_list_${targetMemberId}_${originalMessageId}`)
        .setLabel('Edit')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`calc_cancel_${originalMessageId}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.update({
      content: buildCartMessage(pendingList, interaction.message.content),
      components: [reviewRow],
    });
  }
}
