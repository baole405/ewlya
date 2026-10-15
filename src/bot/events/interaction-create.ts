import { Events, Interaction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../../database/prisma';
import { performMemberSync, generateConfirmationBoard } from '../utils/sync-helper';
import { MemberService } from '../services/member.service';
import { PointWizardService } from '../services/point-wizard.service';
import { AnnouncementService } from '../services/announcement.service';
import { LoggerService } from '../services/logger.service';
import { CommandTrackerService } from '../services/command-tracker.service';
import { MinesDropService } from '../services/mines-drop.service';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  // Always attempt auto-registration for the interactor (Fire and forget to avoid 3s timeout)
  MemberService.autoRegister(interaction).catch(console.error);

  // 1. Handle Commands (Slash & Context Menu)
  if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
    const client = interaction.client as any;
    const command = client.commands?.get(interaction.commandName);

    if (!command) return;

    // Dev Bot Channel Guard: When running as local dev bot (IS_LOCAL_BOT === 'true'), restrict commands to dev channels
    const isLocalBot = process.env['IS_LOCAL_BOT'] === 'true';
    if (isLocalBot) {
      const allowedDevChannels = [
        process.env['TEST_CHANNEL_ID'],
        process.env['ANNOUCEMENTS_DEVELOPER_ID'],
        process.env['PROGRESSION_CHECK_ID_DEVELOPER'],
        process.env['EWLYA_EDIT_LOGS_ID'],
      ].filter(Boolean) as string[];

      const currentChannelId = interaction.channelId;
      if (currentChannelId && !allowedDevChannels.includes(currentChannelId)) {
        const primaryTestChannel = process.env['TEST_CHANNEL_ID'] || '1424269975698407454';
        return interaction.reply({
          content: `⚠️ **[Liza da Chicken - Dev Bot]** Testing is restricted to <#${primaryTestChannel}>.`,
          ephemeral: true,
        });
      }
    }

    // Access Controls for Commands
    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
    const isAdmin = adminIds.includes(interaction.user.id);

    const member = await prisma.member.findUnique({ where: { discordId: interaction.user.id } });
    const isOfficial = member && member.status === 'OFFICIAL';

    const isPublicMemberCommand = ['profile', 'birthday'].includes(interaction.commandName);
    const isMemberCommand = ['progression', 'list-members', 'check-profile', 'mines-drop', 'leaderboard', 'summarize'].includes(interaction.commandName);
    const isAdminCommand = !isMemberCommand && !isPublicMemberCommand;

    if (isAdminCommand && !isAdmin) {
      return interaction.reply({ content: '❌ This command is restricted to Administrators only.', ephemeral: true });
    }

    if (isMemberCommand && !isAdmin && !isOfficial) {
      return interaction.reply({ content: '❌ This command is restricted to Official Clan Members only.', ephemeral: true });
    }

    // AUDIT LOG (Fire and forget)
    LoggerService.logAction(
      interaction.client,
      '⚙️ Command Executed',
      `User **${interaction.user.username}** used \`/${interaction.commandName}\``,
      0x38bdf8,
      interaction.options.data.map(opt => ({
        name: opt.name,
        value: String(opt.value)
      }))
    ).catch(console.error);

    // Track command usage metrics
    try {
      CommandTrackerService.recordUsage(interaction.commandName, interaction.user.id, interaction.user.username);
    } catch (err) {
      console.error('⚠️ Failed to record command usage metric:', err);
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('❌ Error executing command:', error);
      const msg = { content: 'There was an error while executing this command!', ephemeral: true };
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      } catch (replyError) {
        console.error('❌ Failed to send error message (Interaction may have already been acknowledged or expired):', replyError);
      }
    }
    return;
  }

  // 2. Handle Button Interactions
  if (interaction.isButton()) {
    const { customId } = interaction;
    try {
      if (customId.startsWith('prog_input_')) {
        const parts = customId.split('_');
        const memberId = parts[2];
        const checkId = parts[3];
        const originalMessageId = parts[4];

        const modal = new ModalBuilder()
          .setCustomId(`prog_modal_${memberId}_${checkId}_${originalMessageId}`)
          .setTitle('Enter Progression Value');

        const killsInput = new TextInputBuilder()
          .setCustomId('kills_input')
          .setLabel('Boss Kills / Floors Achieved')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g., 85 or 100')
          .setRequired(true);

        const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(killsInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
        return;
      }

      if (customId.startsWith('calc_cat_')) {
        return await PointWizardService.handleCategorySelection(interaction);
      }
      if (customId.startsWith('calc_final_')) {
        return await PointWizardService.handleFinalSelection(interaction);
      }
      if (customId.startsWith('calc_back_')) {
        return await PointWizardService.handleBack(interaction);
      }
      if (customId.startsWith('calc_confirm_save_')) {
        return await PointWizardService.handleConfirmSave(interaction);
      }
      if (customId.startsWith('calc_edit_list_')) {
        return await PointWizardService.handleEditList(interaction);
      }
      if (customId.startsWith('calc_back_to_cart_')) {
        return await PointWizardService.handleBackToCart(interaction);
      }
      if (customId.startsWith('calc_qtyapply_')) {
        return await PointWizardService.handleQuantityChoice(interaction);
      }
      if (customId.startsWith('calc_cancel')) {
        return await PointWizardService.handleCancel(interaction);
      }

      if (customId.startsWith('announce_send_') || customId === 'sync_view_official') {
        return await AnnouncementService.handleInteraction(interaction);
      }

      if (customId === 'sync_reminder_update') {
        const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(id => id);
        if (!adminIds.includes(interaction.user.id)) {
          return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
        }
        await interaction.deferUpdate();
        try {
          const guild = interaction.guild;
          if (!guild) return interaction.followUp({ content: '❌ Must be used in a server.', ephemeral: true });

          try {
            await performMemberSync(guild, adminIds);
          } catch (err: any) {
            console.error('Rate limit or fetch error:', err);
            if (err.name === 'GatewayRateLimitError' || err.message?.includes('rate limited') || err.message?.includes('Rate limit')) {
              await interaction.followUp({ content: '⏳ Discord API rate limit reached. Please wait 30-60 seconds before trying to sync again.', ephemeral: true });
              return;
            } else {
              await interaction.followUp({ content: '❌ Sync failed. Check logs for details.', ephemeral: true });
              return;
            }
          }

          const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
          let roleMention = '@mod';
          const modRole = guild.roles.cache.find((r: any) => r.name.toLowerCase() === 'mod');
          if (modRole) roleMention = `<@&${modRole.id}>`;

          const { embed, components } = await generateConfirmationBoard(adminIds, roleMention, currentMonthName);
          const message = interaction.message;
          await message.edit({ embeds: [embed], components });
        } catch (err) {
          console.error(err);
        }
        return;
      }

      if (customId === 'sync_reminder_confirm') {
        const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(id => id);
        if (!adminIds.includes(interaction.user.id)) {
          return interaction.reply({ content: '❌ Permission denied. You must be an admin to confirm.', ephemeral: true });
        }
        await interaction.deferUpdate();
        try {
          const message = interaction.message;
          const currentEmbed = message.embeds[0];
          const footerText = currentEmbed.footer?.text || '';
          
          const confirmMatch = footerText.match(/confirm:(.*)/);
          let confirmedIds: string[] = [];
          if (confirmMatch && confirmMatch[1]) {
            confirmedIds = confirmMatch[1].split(',').filter(id => id);
          }

          if (confirmedIds.includes(interaction.user.id)) {
            return interaction.followUp({ content: '⚠️ You have already confirmed.', ephemeral: true });
          }

          confirmedIds.push(interaction.user.id);

          const newEmbed = EmbedBuilder.from(currentEmbed)
            .setFooter({ text: `Liza & The DarkStar Team | confirm:${confirmedIds.join(',')}` });

          const confirmNames = confirmedIds.map(id => `<@${id}>`).join('\n');

          if (confirmedIds.length >= adminIds.length) {
            newEmbed
              .setTitle('✅ Member Sync - Fully Confirmed')
              .setColor(0x22c55e)
              .setDescription(`✅ All admins have confirmed! Thank you.\n\n**Confirmations (${confirmedIds.length}/${adminIds.length}):**\n${confirmNames}`);
            
            const viewDetailsBtn = new ButtonBuilder()
              .setCustomId('sync_reminder_view_details')
              .setLabel('👁️ View Members Details')
              .setStyle(ButtonStyle.Secondary);
            const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(viewDetailsBtn);
            
            await message.edit({ embeds: [newEmbed], components: [newRow as any] });
          } else {
            const oldDesc = currentEmbed.description || '';
            const newDesc = oldDesc.replace(/\*\*Confirmations \(.*\):\*\*\n.*/s, `**Confirmations (${confirmedIds.length}/${adminIds.length}):**\n${confirmNames}`);
            newEmbed.setDescription(newDesc);
            await message.edit({ embeds: [newEmbed] });
          }
        } catch (err) {
          console.error(err);
        }
        return;
      }

      if (customId === 'sync_reminder_view_details') {
        const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(id => id);
        if (!adminIds.includes(interaction.user.id)) {
          return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });
        try {
          const officials = await prisma.member.findMany({
            where: { status: 'OFFICIAL' },
          });

          const admins = officials.filter(m => m.role === 'ADMIN' || adminIds.includes(m.discordId));
          const regulars = officials.filter(m => m.role !== 'ADMIN' && !adminIds.includes(m.discordId));

          let detailsText = '**👑 Admins & Mods:**\n';
          admins.forEach(a => {
            detailsText += `- **${a.nickname || a.ign}** (<@${a.discordId}>) - Roles: ${a.roles.join(', ')}\n`;
          });

          detailsText += '\n**👥 Members:**\n';
          regulars.forEach(m => {
            detailsText += `- **${m.nickname || m.ign}** (<@${m.discordId}>) - Roles: ${m.roles.join(', ')}\n`;
          });

          if (detailsText.length > 4000) {
            detailsText = detailsText.substring(0, 3950) + '\n... *(List truncated)*';
          }

          const embed = new EmbedBuilder()
            .setTitle('📋 Detailed Official Member List')
            .setColor(0x3b82f6)
            .setDescription(detailsText)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        } catch (err) {
          console.error(err);
          await interaction.editReply({ content: '❌ Failed to load member details.' });
        }
        return;
      }
    } catch (err) {
      console.error('❌ Error handling Button Interaction:', err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ An error occurred while processing this button interaction.', ephemeral: true });
        } else {
          await interaction.followUp({ content: '❌ An error occurred while processing this button interaction.', ephemeral: true });
        }
      } catch (replyErr) {
        console.error('❌ Failed to send button error reply:', replyErr);
      }
      return;
    }

    if (customId === 'help_view_commands') {
      const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
      const isAdmin = adminIds.includes(interaction.user.id);
      
      const embed = new EmbedBuilder()
        .setTitle(isAdmin ? '🛠️ Admin Commands' : '📘 Member Commands')
        .setColor(isAdmin ? 0xf43f5e : 0x38bdf8)
        .setTimestamp();
        
      if (isAdmin) {
        embed.setDescription('Here are the commands available to Administrators:\n\n' +
          '**Right-Click > Apps > Award Points** - Quick way to award points to an image submission.\n' +
          '**`/wizard`** - Start the Point Wizard to award points manually via a message link.\n' +
          '**`/season`** - Manage point seasons (Create/Close/Reset/View seasons).\n' +
          '**`/leaderboard`** - View live scoreboard and past season archives.\n' +
          '**`/progression`** - Unified progression engine (`now`, `status`, `list`, `create`, `edit`, `update`, `complete`, `postpone`, `delete`).\n' +
          '**`/sync-members`** - Sync the member database with current server roles.\n' +
          '**`/command-stats`** - View command usage metrics and analytics.\n' +
          '**`/setup-help-panel`** - Deploy the permanent help hub panel to a channel.'
        );
      } else {
        embed.setDescription('Here are the commands available to you:\n\n' +
          '**`/leaderboard`** - View current season standings & Top 3 Podium.\n' +
          '**`/check-profile`** - Check member profile and privacy details.\n' +
          '**`/progression now`** - Check active progression status and targets.\n' +
          '**`/progression status`** - View all progression checks overview.\n' +
          '**`/summarize`** - Use AI to summarize recent channel chat (Official only).\n' +
          '**`/list-members`** - View the member roster.'
        );
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (customId === 'help_edit_member' || customId === 'profile_view_self') {
      const isRefresh = customId === 'profile_view_self';
      if (isRefresh) {
        await interaction.deferUpdate();
      }

      let member = await prisma.member.findUnique({
        where: { discordId: interaction.user.id }
      });

      if (!member) {
        await MemberService.autoRegister(interaction);
        member = await prisma.member.findUnique({
          where: { discordId: interaction.user.id }
        });
      }

      if (!member) {
        const errorContent = '❌ You are not registered in the clan member database yet.';
        if (isRefresh) {
          await interaction.followUp({ content: errorContent, ephemeral: true });
        } else {
          await interaction.reply({ content: errorContent, ephemeral: true });
        }
        return;
      }

      let birthDateStr = 'Not provided';
      let birthYearStr = 'Hidden / Not provided';

      if (member.birthdate) {
        const parts = member.birthdate.split('/');
        if (parts.length >= 2) {
          birthDateStr = `${parts[0]}/${parts[1]}`;
          birthYearStr = parts[2] || 'Hidden / Not provided';
        } else {
          birthDateStr = member.birthdate;
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(`👤 Your Profile: ${member.nickname || member.ign}`)
        .setColor(member.status === 'OFFICIAL' ? 0x3b82f6 : 0x10b981)
        .setThumbnail(member.avatarUrl || interaction.user.displayAvatarURL() || null)
        .addFields(
          { name: '🎮 IGN', value: member.ign, inline: true },
          { name: '🆔 Discord', value: `<@${member.discordId}>`, inline: true },
          { name: '🎫 GS Friend Code', value: member.gsCode || 'Not provided', inline: true },
          { name: '🎂 Birthday (DD/MM)', value: birthDateStr, inline: true },
          { name: '📅 Birth Year', value: birthYearStr, inline: true },
          { name: '🧬 Gender', value: member.gender || 'Not provided', inline: true },
          { name: '🗺️ Country', value: member.country || 'Not provided', inline: true },
          { name: '📊 Clan Status', value: member.status, inline: true },
          { name: '🔒 Privacy Level', value: member.profilePrivacy || 'PUBLIC', inline: true }
        )
        .setFooter({ text: `DarkStar Clan Member Database` })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('profile_edit_basic')
          .setLabel('📝 Edit Basic Info')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('profile_edit_privacy')
          .setLabel('🔒 Edit Birthdate & Privacy')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('profile_view_self')
          .setLabel('👁️ Refresh Profile')
          .setStyle(ButtonStyle.Success)
      );

      if (isRefresh) {
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }
      return;
    }

    if (customId === 'profile_edit_basic') {
      let member = await prisma.member.findUnique({
        where: { discordId: interaction.user.id }
      });

      if (!member) {
        member = await MemberService.ensureMemberExists(interaction.user, interaction.guild);
      }

      const modal = new ModalBuilder()
        .setCustomId('profile_basic_modal')
        .setTitle('Edit Basic Info');

      const ignInput = new TextInputBuilder()
        .setCustomId('edit_ign')
        .setLabel('IGN (In-Game Name)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., DarkStarHero')
        .setValue(member.ign || '')
        .setRequired(true);

      const gsCodeInput = new TextInputBuilder()
        .setCustomId('edit_gs_code')
        .setLabel('GS Friend Code')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 123-456-789')
        .setValue(member.gsCode || '')
        .setRequired(false);

      const genderInput = new TextInputBuilder()
        .setCustomId('edit_gender')
        .setLabel('Gender')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Male, Female')
        .setValue(member.gender || '')
        .setRequired(false);

      const countryInput = new TextInputBuilder()
        .setCustomId('edit_country')
        .setLabel('Country')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Vietnam')
        .setValue(member.country || '')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(ignInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(gsCodeInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(genderInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(countryInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'profile_edit_privacy') {
      let member = await prisma.member.findUnique({
        where: { discordId: interaction.user.id }
      });

      if (!member) {
        member = await MemberService.ensureMemberExists(interaction.user, interaction.guild);
      }

      const modal = new ModalBuilder()
        .setCustomId('profile_privacy_modal')
        .setTitle('Edit Birthdate & Privacy');

      // Parse current birthdate
      let currentDDMM = '';
      let currentYYYY = '';
      if (member.birthdate) {
        const parts = member.birthdate.split('/');
        if (parts.length >= 2) {
          currentDDMM = `${parts[0]}/${parts[1]}`;
          currentYYYY = parts[2] || '';
        } else {
          currentDDMM = member.birthdate;
        }
      }

      const birthdateInput = new TextInputBuilder()
        .setCustomId('edit_birthdate')
        .setLabel('Birth Date (DD/MM) - Announcements')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 15/08 (Leave blank = NO Birthday Bot)')
        .setValue(currentDDMM)
        .setRequired(false);

      const birthyearInput = new TextInputBuilder()
        .setCustomId('edit_birthyear')
        .setLabel('Birth Year (YYYY) - Optional')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 2005 (Optional, leave blank to hide)')
        .setValue(currentYYYY)
        .setRequired(false);

      const privacyInput = new TextInputBuilder()
        .setCustomId('edit_privacy')
        .setLabel('Privacy (PUBLIC / OFFICIAL / PRIVATE)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('PUBLIC (everyone) | OFFICIAL (clan only) | PRIVATE (self/admin)')
        .setValue(member.profilePrivacy || 'PUBLIC')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(birthdateInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(birthyearInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(privacyInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // ---------------------------------------------------------
    // MINES AWARD CONFIRMATION BUTTONS
    // ---------------------------------------------------------
    if (customId === 'mines_award_confirm') {
      const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(Boolean);
      const authorizedIds = [...adminIds, '152989780274184192', '517740134440075274'];
      if (!authorizedIds.includes(interaction.user.id)) {
        return interaction.reply({ content: '❌ Only authorized Admins can confirm awarding.', ephemeral: true });
      }

      await interaction.deferUpdate();

      try {
        const result = await MinesDropService.awardPrizes(
          interaction.user.id,
          interaction.user.username,
          interaction.client
        );

        const seasonInfo = result.season
          ? `Points have been added to Member total points and the active Clan Season: **${result.season.name}**!`
          : `Points have been added directly to Member total clan points!`;

        const announcementEmbed = new EmbedBuilder()
          .setTitle(`🎉 ${result.event.name} - Official Winners Announced!`)
          .setDescription(
            `The Mines Equip Drops event has officially concluded!\n` +
            `${seasonInfo}\n\n` +
            `### 🏆 Hall of Winners\n` +
            result.winners
              .map(w => {
                const medal = w.rank === 1 ? '🥇 1st Place' : w.rank === 2 ? '🥈 2nd Place' : '🥉 3rd Place';
                const userMention = w.discordId ? `<@${w.discordId}>` : `**${w.nickname}**`;
                return `**${medal}**: ${userMention}\n> ⛏️ **${w.dropCount}** drops ➔ Awarded **+${w.projectedPoints}** Clan Points!`;
              })
              .join('\n\n') +
            `\n\nCongratulations to our top miners and thank you to everyone who participated!`
          )
          .setColor(0x10b981)
          .setThumbnail(interaction.guild?.iconURL() || null)
          .setFooter({ text: `Awarded by ${interaction.user.username}` })
          .setTimestamp();

        // Update the original preview message
        await interaction.editReply({ embeds: [announcementEmbed], components: [] });

        // Also post announcement to the mines-drops channel for everyone to celebrate
        const minesChannelId = process.env['MINES_DROPS_CHANNEL_ID'] || '1265850153517060096';
        const minesChan = await interaction.client.channels.fetch(minesChannelId).catch(() => null);
        if (minesChan && minesChan.isTextBased()) {
          await (minesChan as any).send({ embeds: [announcementEmbed] }).catch(() => null);
        }
      } catch (err: any) {
        console.error('Error awarding mines drop prizes:', err);
        await interaction.editReply({ content: `❌ Failed to award prizes: ${err.message || 'Unknown error'}`, components: [] });
      }
      return;
    }

    if (customId === 'mines_award_cancel') {
      await interaction.update({
        content: '❌ Event prize awarding has been cancelled. No points were added.',
        embeds: [],
        components: [],
      });
      return;
    }

    // ---------------------------------------------------------
    // Mines Equip Drops Counter Handlers (dec, inc, cancel, confirm)
    // ---------------------------------------------------------
    if (customId.startsWith('mines_cnt_')) {
      const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(Boolean);
      const authorizedIds = [...adminIds, '152989780274184192', '517740134440075274'];
      const isAuthorized =
        authorizedIds.includes(interaction.user.id) ||
        (interaction.user.username ? interaction.user.username.toLowerCase().includes('grimex') : false);

      if (!isAuthorized) {
        return interaction.reply({ content: '❌ Only authorized Admins can verify equip drops.', ephemeral: true });
      }

      const parts = customId.split('_');
      // Format: mines_cnt_<action>_<memberId>_<count>_<channelId>_<messageId>
      const action = parts[2]; // 'dec' | 'inc' | 'confirm' | 'cancel'
      const memberId = parts[3];

      if (action === 'cancel') {
        await interaction.message.delete().catch(() => {});
        return;
      }

      const countStr = parts[4];
      const channelId = parts.length >= 7 ? parts[5] : (interaction.channelId || '');
      const messageId = parts.length >= 7 ? parts[6] : parts[5];
      let count = parseInt(countStr, 10) || 1;

      if (action === 'dec' || action === 'inc') {
        if (action === 'dec') {
          count = Math.max(1, count - 1);
        } else {
          count = count + 1;
        }

        const targetMember = await prisma.member.findUnique({ where: { id: memberId } });
        const memberMention = targetMember?.discordId ? `<@${targetMember.discordId}>` : `**${targetMember?.nickname || 'Member'}**`;

        const messageUrl = channelId && messageId && interaction.guildId
          ? `https://discord.com/channels/${interaction.guildId}/${channelId}/${messageId}`
          : undefined;

        const counterEmbed = new EmbedBuilder()
          .setTitle('⛏️ Mines Equip Drop Counter')
          .setDescription(
            `👤 **Member:** ${memberMention} (\`${targetMember?.nickname || 'Member'}\`)\n` +
            `💎 **Drop Count:** \`${count}\`\n` +
            (messageUrl ? `🔗 **Source Post:** [View in <#${channelId}>](${messageUrl})\n\n` : '\n') +
            `Adjust the drop count below and click **Confirm**:`
          )
          .setColor(0xf59e0b)
          .setFooter({ text: `Adjusted by ${interaction.user.username}` })
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`mines_cnt_dec_${memberId}_${count}_${channelId}_${messageId}`)
            .setLabel('➖ 1')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(count <= 1),
          new ButtonBuilder()
            .setCustomId(`mines_cnt_val_${memberId}_${count}_${channelId}_${messageId}`)
            .setLabel(`💎 ${count} Drop${count > 1 ? 's' : ''}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`mines_cnt_inc_${memberId}_${count}_${channelId}_${messageId}`)
            .setLabel('➕ 1')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`mines_cnt_confirm_${memberId}_${count}_${channelId}_${messageId}`)
            .setLabel('✅ Confirm')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`mines_cnt_cancel_${memberId}_0_${channelId}_${messageId}`)
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.update({ embeds: [counterEmbed], components: [row] });
        return;
      }

      if (action === 'confirm') {
        // 1. Check idempotency: already counted?
        const existing = await prisma.minesDropRecord.findUnique({
          where: { messageId },
        });
        if (existing) {
          return interaction.reply({
            content: `⚠️ This drop screenshot was already recorded! (Record ID: \`${existing.id}\`)`,
            ephemeral: true,
          });
        }

        const targetMember = await prisma.member.findUnique({ where: { id: memberId } });
        if (!targetMember) {
          return interaction.reply({ content: '❌ Member not found in database.', ephemeral: true });
        }

        // 2. Add drops to active event
        const result = await MinesDropService.addManualDrops(
          memberId,
          count,
          interaction.user.id,
          `Reaction counter by ${interaction.user.username}`,
          messageId
        );

        if (!result.success) {
          return interaction.reply({ content: '❌ Failed to record drops.', ephemeral: true });
        }

        // 3. React with ✅ on the original screenshot message in target channel
        try {
          const targetChan = await interaction.client.channels.fetch(channelId).catch(() => null);
          if (targetChan && targetChan.isTextBased()) {
            const origMsg = await (targetChan as any).messages.fetch(messageId).catch(() => null);
            if (origMsg) {
              await origMsg.react('✅').catch(() => {});
            }
          }
        } catch (e) {}

        // 4. Update the card in test channel into the confirmed log embed
        const messageUrl = channelId && messageId && interaction.guildId
          ? `https://discord.com/channels/${interaction.guildId}/${channelId}/${messageId}`
          : undefined;

        let avatarURL: string | null = null;
        if (targetMember.discordId) {
          try {
            const u = await interaction.client.users.fetch(targetMember.discordId);
            avatarURL = u.displayAvatarURL({ size: 128 });
          } catch {}
        }

        const logEmbed = new EmbedBuilder()
          .setTitle('⛏️ Mines Equip Drop Verified')
          .setColor(0x10b981)
          .addFields(
            { name: 'Member', value: `<@${targetMember.discordId}> (\`${targetMember.nickname}\`)`, inline: true },
            { name: 'Drops Added', value: `**+${count}** 💎`, inline: true },
            { name: 'Total Drops', value: `\`${result.totalDrops}\` drops`, inline: true },
            { name: 'Verified By', value: `<@${interaction.user.id}>`, inline: true },
          )
          .setTimestamp();

        if (messageUrl) {
          logEmbed.addFields({ name: 'Screenshot Post', value: `[🔗 Jump to Screenshot](${messageUrl})`, inline: false });
          logEmbed.setURL(messageUrl);
        }
        if (avatarURL) {
          logEmbed.setThumbnail(avatarURL);
        }

        await interaction.update({
          embeds: [logEmbed],
          components: [],
        });
        return;
      }
    }

    if (customId === 'mines_view_ldb') {
      await interaction.deferReply({ ephemeral: true });
      try {
        const { event, standings, totalDrops, totalParticipants } = await MinesDropService.getLeaderboard();

        const embed = new EmbedBuilder()
          .setTitle(`⛏️ ${event.name} - Leaderboard`)
          .setDescription(
            `**Event Status:** \`${event.status}\`\n` +
            `**Prizes:** 🥇 1st: **${event.firstPoints}** pts | 🥈 2nd: **${event.secondPoints}** pts | 🥉 3rd: **${event.thirdPoints}** pts\n` +
            `**Total Drops Recorded:** \`${totalDrops}\` 💎 | **Participants:** \`${totalParticipants}\`\n\n` +
            `*Admins verify drop screenshots in <#${process.env['MINES_DROPS_CHANNEL_ID'] || '1265850153517060096'}> with ✅ or ⛏️ to count!*`
          )
          .setColor(0xf59e0b)
          .setThumbnail(interaction.guild?.iconURL() || null)
          .setTimestamp();

        if (standings.length === 0) {
          embed.addFields({
            name: '📊 Standings',
            value: 'No equip drops recorded yet. Head into the Mines and post your drops!',
          });
        } else {
          const lines = standings.slice(0, 15).map(entry => {
            let badge = `\`#${entry.rank}\``;
            if (entry.rank === 1) badge = '🥇';
            else if (entry.rank === 2) badge = '🥈';
            else if (entry.rank === 3) badge = '🥉';

            const prizeInfo = entry.projectedPoints > 0 ? ` ➔ **+${entry.projectedPoints} pts**` : '';
            const userTag = entry.discordId ? `<@${entry.discordId}>` : `**${entry.nickname}**`;
            return `${badge} ${userTag} — **${entry.dropCount}** drops${prizeInfo}`;
          });

          embed.addFields({
            name: '🏆 Top Miners',
            value: lines.join('\n'),
          });
        }

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('Error in mines_view_ldb button:', err);
        await interaction.editReply({ content: '❌ Failed to retrieve the leaderboard.' });
      }
      return;
    }

    if (customId === 'help_season_ldb') {
      await interaction.deferReply({ ephemeral: true });
      try {
        const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
        if (!activeSeason) {
          return interaction.editReply({ content: '❌ There is no active season right now. Ask an admin to start one with `/season start`.' });
        }

        const submissions = await prisma.submission.groupBy({
          by: ['memberId'],
          where: { seasonId: activeSeason.id },
          _sum: { points: true },
        });

        if (submissions.length === 0) {
          const emptyEmbed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle(`🏆 ${activeSeason.name} — Live Leaderboard`)
            .setDescription('No points have been recorded yet this season. Be the first!')
            .setTimestamp();
          return interaction.editReply({ embeds: [emptyEmbed] });
        }

        const memberIds = submissions.map((s) => s.memberId);
        const members = await prisma.member.findMany({ where: { id: { in: memberIds } } });

        const discordIds = members.map((m) => m.discordId).filter(Boolean) as string[];
        const guildMembers = new Map<string, any>();
        if (interaction.guild && discordIds.length > 0) {
          try {
            const fetched = await interaction.guild.members.fetch({ user: discordIds });
            fetched.forEach((gm: any, id: string) => guildMembers.set(id, gm));
          } catch (_) { /* ignore fetch errors */ }
        }

        const ranked = submissions
          .map((sub) => {
            const dbMember = members.find((m) => m.id === sub.memberId);
            const gm = dbMember?.discordId ? guildMembers.get(dbMember.discordId) : null;
            return {
              name: gm ? gm.displayName : (dbMember?.nickname || 'Unknown'),
              points: sub._sum.points || 0,
            };
          })
          .sort((a, b) => b.points - a.points);

        const MEDALS = ['🥇', '🥈', '🥉'];
        const list = ranked
          .map((entry, i) => `${MEDALS[i] || '🏅'} **${entry.name}** — ${entry.points} pts`)
          .join('\n');

        const startStr = activeSeason.startDate
          ? `<t:${Math.floor(new Date(activeSeason.startDate).getTime() / 1000)}:D>`
          : '—';

        const embed = new EmbedBuilder()
          .setColor(0x38bdf8)
          .setTitle(`🏆 ${activeSeason.name} — Live Leaderboard`)
          .setDescription(list.length > 4000 ? list.substring(0, 4000) + '\n...' : list)
          .setFooter({ text: `${ranked.length} participant(s) • Season started ${startStr.replace(/<|>/g, '')}` })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('[help_season_ldb] Error:', err);
        return interaction.editReply({ content: '❌ Failed to load leaderboard. Please try again later.' });
      }
    }


    if (customId === 'help_clan_vision') {
      await interaction.deferReply({ ephemeral: true });
      try {
        const visionChannelId = '1303078062950449193';
        const visionChannel = await interaction.client.channels.fetch(visionChannelId).catch(() => null);
        let visionContext = '';
        if (visionChannel && visionChannel.isTextBased()) {
          const visionMsgs = await (visionChannel as any).messages.fetch({ limit: 50 }).catch(() => null);
          if (visionMsgs) {
            visionContext = [...visionMsgs.values()]
              .reverse()
              .map(m => m.content)
              .join('\n');
          }
        }

        const embed = new EmbedBuilder()
          .setTitle('🌌 DarkStar Clan Vision & Goals')
          .setColor(0x8b5cf6)
          .setDescription(visionContext || 'DarkStar is a mobile gaming clan focused on progression, teamplay, and community.')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        await interaction.editReply('❌ Failed to fetch clan vision context. Please try again later.');
      }
      return;
    }

    if (customId === 'help_ask_liza') {
      const modal = new ModalBuilder()
        .setCustomId('help_ask_liza_modal')
        .setTitle("Ask DarkStar's Mascot");

      const questionInput = new TextInputBuilder()
        .setCustomId('liza_question_input')
        .setLabel('What would you like to ask?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('e.g., What is the clan vision? or (for members) how many points do I have?')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(questionInput));
      await interaction.showModal(modal);
      return;
    }
  }

  // 3. Handle Select Menu Interactions
  if (interaction.isStringSelectMenu()) {
    try {
      const { customId } = interaction;

      if (customId.startsWith('calc_ldb_stage_')) {
        return await PointWizardService.handleStageSelection(interaction);
      }
      if (customId.startsWith('calc_final_ldb_')) {
        return await PointWizardService.handleFinalSelection(interaction);
      }
      if (customId.startsWith('calc_item_edit_menu_')) {
        return await PointWizardService.handleSelectItemToEdit(interaction);
      }
    } catch (err) {
      console.error('❌ Error handling Select Menu Interaction:', err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ An error occurred while processing this select menu interaction.', ephemeral: true });
        } else {
          await interaction.followUp({ content: '❌ An error occurred while processing this select menu interaction.', ephemeral: true });
        }
      } catch (replyErr) {
        console.error('❌ Failed to send select menu error reply:', replyErr);
      }
      return;
    }
  }

  // 4. Handle Autocomplete Interactions
  if (interaction.isAutocomplete()) {
    const client = interaction.client as any;
    const command = client.commands?.get(interaction.commandName);

    if (!command || !command.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error('❌ Autocomplete Error:', error);
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    const { customId } = interaction;

    if (customId.startsWith('calc_custom_modal_')) {
      return await PointWizardService.handleCustomModalSubmit(interaction);
    }
    if (customId.startsWith('calc_qty_modal_')) {
      return await PointWizardService.handleQuantityModalSubmit(interaction);
    }

    // ---------------------------------------------------------
    // MINES DROP CONTEXT MENU MODAL SUBMIT
    // ---------------------------------------------------------
    if (customId.startsWith('mines_modal_')) {
      const parts = customId.split('_');
      // Format: mines_modal_<messageId>_<channelId>_<authorId>
      const messageId = parts[2];
      const channelId = parts[3];
      const authorId = parts[4];

      const countStr = interaction.fields.getTextInputValue('drop_count');
      const count = parseInt(countStr.trim(), 10);
      const reasonInput = interaction.fields.getTextInputValue('drop_reason');
      const reason = reasonInput?.trim() || `Verified by ${interaction.user.username}`;

      if (isNaN(count) || count <= 0) {
        return interaction.reply({
          content: '❌ Please enter a valid positive number for drop count!',
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const targetUser = await interaction.client.users.fetch(authorId);
        const member = await MemberService.ensureMemberExists(targetUser, interaction.guild);

        // Record drops
        const result = await MinesDropService.addManualDrops(
          member.id,
          count,
          interaction.user.id,
          reason,
          messageId
        );

        if (!result.success) {
          return interaction.editReply({ content: '❌ Failed to record drops in database.' });
        }

        // React ✅ on target message
        try {
          const targetChan = await interaction.client.channels.fetch(channelId).catch(() => null);
          if (targetChan && targetChan.isTextBased()) {
            const origMsg = await (targetChan as any).messages.fetch(messageId).catch(() => null);
            if (origMsg) {
              await origMsg.react('✅').catch(() => {});
            }
          }
        } catch (e) {}

        // Send log embed to LOG_OF_LB_POINTS_ID & TEST_CHANNEL_ID
        const targetChannelIds = Array.from(
          new Set([process.env['LOG_OF_LB_POINTS_ID'], process.env['TEST_CHANNEL_ID']].filter(Boolean) as string[])
        );

        const messageUrl = channelId && messageId && interaction.guildId
          ? `https://discord.com/channels/${interaction.guildId}/${channelId}/${messageId}`
          : undefined;

        let avatarURL: string | null = null;
        if (member.discordId) {
          try {
            const u = await interaction.client.users.fetch(member.discordId);
            avatarURL = u.displayAvatarURL({ size: 128 });
          } catch {}
        }

        const logEmbed = new EmbedBuilder()
          .setTitle('⛏️ Mines Equip Drop Verified')
          .setColor(0x10b981)
          .addFields(
            { name: 'Member', value: `<@${member.discordId}> (\`${member.nickname}\`)`, inline: true },
            { name: 'Drops Added', value: `**+${count}** 💎`, inline: true },
            { name: 'Total Drops', value: `\`${result.totalDrops}\` drops`, inline: true },
            { name: 'Verified By', value: `<@${interaction.user.id}>`, inline: true },
          )
          .setTimestamp();

        if (reasonInput?.trim()) {
          logEmbed.addFields({ name: 'Note', value: reasonInput.trim(), inline: false });
        }

        if (messageUrl) {
          logEmbed.addFields({ name: 'Screenshot Post', value: `[🔗 Jump to Screenshot](${messageUrl})`, inline: false });
          logEmbed.setURL(messageUrl);
        }
        if (avatarURL) {
          logEmbed.setThumbnail(avatarURL);
        }

        for (const targetId of targetChannelIds) {
          try {
            const logChan = await interaction.client.channels.fetch(targetId).catch(() => null);
            if (logChan && logChan.isTextBased()) {
              await (logChan as any).send({ embeds: [logEmbed] }).catch(() => null);
            }
          } catch (logErr) {
            console.error(`Failed to send drop log to channel ${targetId}:`, logErr);
          }
        }

        return interaction.editReply({
          content: `✅ Successfully recorded **+${count}** drop(s) for <@${authorId}>!\n- **New Total:** \`${result.totalDrops}\` drops\n- **Note:** *${reason}*`,
        });
      } catch (err: any) {
        console.error('Error handling mines drop modal submit:', err);
        return interaction.editReply({ content: `❌ Error: ${err.message || 'Failed to process drop record.'}` });
      }
    }

    if (customId.startsWith('prog_modal_')) {
      const parts = customId.split('_');
      const memberId = parts[2];
      const checkId = parts[3];
      const originalMessageId = parts[4];
      const valueStr = interaction.fields.getTextInputValue('kills_input');
      const value = parseInt(valueStr, 10);

      if (isNaN(value)) {
        return interaction.reply({ content: '❌ Please enter a valid number!', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const check = await prisma.progressionCheck.findUnique({ where: { id: checkId } });
        const member = await prisma.member.findUnique({ where: { id: memberId } });

        if (!check || !member) {
          return interaction.editReply('❌ Check or Member info not found.');
        }

        // Fetch target value from ProgressionRequirement
        const requirement = await prisma.progressionRequirement.findFirst({
          where: { progressionCheckId: check.id }
        });
        let targetValue = 100;
        if (requirement) {
          const match = requirement.title.match(/\d+/);
          if (match) targetValue = parseInt(match[0], 10);
        }

        const isCompleted = value >= targetValue;

        const notePrefix = check.title.toLowerCase().includes('raid') ? 'Kills' : 'Floor';

        await prisma.memberProgressionStatus.upsert({
          where: {
            progressionCheckId_memberId: {
              progressionCheckId: check.id,
              memberId: member.id
            }
          },
          update: {
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
            note: `${notePrefix}: ${value}`
          },
          create: {
            progressionCheckId: check.id,
            memberId: member.id,
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
            note: `${notePrefix}: ${value}`
          }
        });

        // 1. Delete the temporary button message
        if (interaction.message) {
          await interaction.message.delete().catch(() => {});
        }

        // 2. Fetch original message to remove 🧮 and react with ✅
        if (interaction.channel && originalMessageId) {
          const originalMessage = await interaction.channel.messages.fetch(originalMessageId).catch(() => null);
          if (originalMessage) {
            const abacusReaction = originalMessage.reactions.cache.find(r => r.emoji.name === '🧮');
            if (abacusReaction) {
              await abacusReaction.users.remove(interaction.user.id).catch(() => {});
            }
            await originalMessage.react('✅').catch(() => {});
          }
        }

        await LoggerService.logAction(
          interaction.client,
          '✅ Progression Verified',
          `Admin **${interaction.user.username}** updated Raid progress for **${member.nickname}** to **${value}/${targetValue}** via reaction modal.`,
          isCompleted ? 0x22c55e : 0xef4444,
          [{ name: 'Check', value: check.title }]
        );

        await interaction.editReply(`✅ Successfully updated progress for **${member.nickname}**!\n📊 Progress: **${value}/${targetValue}** | Status: **${isCompleted ? 'Completed' : 'Not Complete'}**`);
      } catch (err) {
        console.error(err);
        await interaction.editReply('❌ An error occurred while updating progress.');
      }
      return;
    }

    if (customId === 'profile_basic_modal') {
      await interaction.deferReply({ ephemeral: true });
      try {
        await MemberService.ensureMemberExists(interaction.user, interaction.guild);

        const ign = interaction.fields.getTextInputValue('edit_ign');
        const gsCode = interaction.fields.getTextInputValue('edit_gs_code');
        const gender = interaction.fields.getTextInputValue('edit_gender');
        const country = interaction.fields.getTextInputValue('edit_country');

        // Update database
        await prisma.member.update({
          where: { discordId: interaction.user.id },
          data: {
            ign,
            gsCode: gsCode || null,
            gender: gender || null,
            country: country || null,
          }
        });

        await LoggerService.logAction(
          interaction.client,
          '📝 Member Profile Updated',
          `User **${interaction.user.username}** updated their basic profile fields.`,
          0x38bdf8,
          [
            { name: 'IGN', value: ign },
            { name: 'GS Code', value: gsCode || 'None' },
            { name: 'Gender', value: gender || 'None' },
            { name: 'Country', value: country || 'None' }
          ]
        );

        await interaction.editReply('✅ Your profile details have been updated successfully!');
      } catch (err) {
        console.error('❌ Error saving profile update:', err);
        await interaction.editReply('❌ An error occurred while saving your profile update.');
      }
      return;
    }

    if (customId === 'profile_privacy_modal') {
      await interaction.deferReply({ ephemeral: true });
      try {
        await MemberService.ensureMemberExists(interaction.user, interaction.guild);

        const rawBirthdate = interaction.fields.getTextInputValue('edit_birthdate').trim();
        const rawBirthyear = interaction.fields.getTextInputValue('edit_birthyear').trim();
        const rawPrivacy = interaction.fields.getTextInputValue('edit_privacy').trim().toLowerCase();

        // Flexible privacy parser
        let privacy = 'PUBLIC';
        if (['private', 'priv', 'riêng tư', 'rieng tu', 'ẩn', 'an', 'hide', 'hidden'].includes(rawPrivacy)) {
          privacy = 'PRIVATE';
        } else if (['official', 'clan', 'members', 'thành viên', 'thanh vien', 'official_only'].includes(rawPrivacy)) {
          privacy = 'OFFICIAL';
        } else if (['public', 'pub', 'công khai', 'cong khai', 'all', 'tất cả', 'tat ca'].includes(rawPrivacy)) {
          privacy = 'PUBLIC';
        } else if (rawPrivacy) {
          if (rawPrivacy.includes('priv') || rawPrivacy.includes('tư') || rawPrivacy.includes('ẩn')) {
            privacy = 'PRIVATE';
          } else if (rawPrivacy.includes('off') || rawPrivacy.includes('clan')) {
            privacy = 'OFFICIAL';
          } else {
            privacy = 'PUBLIC';
          }
        }

        let normalizedDDMM: string | null = null;
        let normalizedYYYY: string | null = rawBirthyear || null;

        if (rawBirthdate) {
          const dateParts = rawBirthdate.split(/[\/\-\.\s]+/).map(p => p.trim()).filter(Boolean);
          if (dateParts.length >= 2) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10);

            // Auto-extract YYYY if provided inside birthdate field (e.g. 15/08/2005)
            if (dateParts.length >= 3 && /^\d{4}$/.test(dateParts[2]) && !normalizedYYYY) {
              normalizedYYYY = dateParts[2];
            }

            if (!isNaN(day) && !isNaN(month) && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
              const dd = String(day).padStart(2, '0');
              const mm = String(month).padStart(2, '0');
              normalizedDDMM = `${dd}/${mm}`;
            } else {
              return interaction.editReply('❌ Invalid birth date format. Please use **DD/MM** (e.g., `15/08` or `5/8`).');
            }
          } else {
            return interaction.editReply('❌ Invalid birth date format. Please use **DD/MM** (e.g., `15/08` or `5/8`).');
          }
        }

        // Validate birth year (YYYY) if provided
        if (normalizedYYYY && !/^\d{4}$/.test(normalizedYYYY)) {
          return interaction.editReply('❌ Invalid birth year. Please use a 4-digit **YYYY** format (e.g., `2005`).');
        }

        // Combine birthdate & birthyear for DB storage
        let dbBirthdate: string | null = null;
        if (normalizedDDMM) {
          dbBirthdate = normalizedYYYY ? `${normalizedDDMM}/${normalizedYYYY}` : normalizedDDMM;
        }

        // Update database
        await prisma.member.update({
          where: { discordId: interaction.user.id },
          data: {
            birthdate: dbBirthdate,
            profilePrivacy: privacy
          }
        });

        await LoggerService.logAction(
          interaction.client,
          '🔒 Member Privacy Updated',
          `User **${interaction.user.username}** updated their birthdate and privacy settings.`,
          0x38bdf8,
          [
            { name: 'Birthdate (DD/MM)', value: normalizedDDMM || 'None (Cleared)' },
            { name: 'Birth Year', value: normalizedYYYY || 'Hidden / None' },
            { name: 'Privacy Mode', value: privacy }
          ]
        );

        const birthdateMsg = normalizedDDMM
          ? `🎂 Birthdate set to **${normalizedDDMM}**${normalizedYYYY ? ` (Year: ${normalizedYYYY})` : ''}.`
          : '🎂 Birthdate cleared (no birthday bot announcements).';

        await interaction.editReply(`✅ Your profile privacy & birthday settings have been updated!\n- ${birthdateMsg}\n- 🔒 Privacy Mode: **${privacy}**`);
      } catch (err) {
        console.error('❌ Error saving privacy settings:', err);
        await interaction.editReply('❌ An error occurred while saving your privacy settings. Please make sure your profile is registered in the database.');
      }
      return;
    }

    if (customId === 'help_ask_liza_modal') {
      await interaction.deferReply({ ephemeral: true });
      try {
        const question = interaction.fields.getTextInputValue('liza_question_input');
        const { AISummaryService } = await import('../services/ai-summary.service');

        const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
        const isAdmin = adminIds.includes(interaction.user.id);

        const member = await prisma.member.findUnique({ where: { discordId: interaction.user.id } });
        const isOfficial = member && member.status === 'OFFICIAL';

        if (isAdmin || isOfficial) {
          // Member conversational AI
          const channel = await interaction.client.channels.fetch(interaction.channelId).catch(() => null);
          let messages = new Map();
          if (channel && channel.isTextBased()) {
            messages = await (channel as any).messages.fetch({ limit: 10 }).catch(() => new Map());
          }
          
          const ragMessages = await AISummaryService.retrieveRelevantContext(question, 20);
          const aiResponse = await AISummaryService.answerQuestion(messages as any, ragMessages, question);
          
          await interaction.editReply(aiResponse.answer);
        } else {
          // Visitor -> Fetch vision channel
          const visionChannelId = '1303078062950449193';
          const visionChannel = await interaction.client.channels.fetch(visionChannelId).catch(() => null);
          let visionContext = '';
          if (visionChannel && visionChannel.isTextBased()) {
            const visionMsgs = await (visionChannel as any).messages.fetch({ limit: 50 }).catch(() => null);
            if (visionMsgs) {
              visionContext = [...visionMsgs.values()]
                .reverse()
                .map(m => m.content)
                .join('\n');
            }
          }

          const systemPrompt = `You are "Liza", the friendly AI assistant for the mobile gaming clan "DarkStar".
A visitor (who is not an official clan member) is asking you a question about the clan's vision, goals, or general information.
Please answer their question politely based ONLY on the Clan Vision Context provided below.
If their question is completely unrelated to the clan's vision, goals, or general info, politely explain that as an assistant for visitors, you can only answer questions regarding DarkStar's clan vision and goals.

--- CLAN VISION CONTEXT ---
${visionContext || 'DarkStar is a mobile gaming clan focused on progression, teamplay, and community.'}
--- END OF CONTEXT ---`;

          const { text: answer } = await AISummaryService.callLLM(systemPrompt, question, 500);
          await interaction.editReply(answer);
        }
      } catch (err) {
        console.error("❌ Ask DarkStar's Mascot Modal Error:", err);
        await interaction.editReply('❌ An error occurred while trying to process your request. Please try again later.');
      }
      return;
    }
  }
}
