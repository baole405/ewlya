import { Events, Interaction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../../database/prisma';
import { performMemberSync, generateConfirmationBoard } from '../utils/sync-helper';
import { MemberService } from '../services/member.service';
import { PointWizardService } from '../services/point-wizard.service';
import { AnnouncementService } from '../services/announcement.service';
import { LoggerService } from '../services/logger.service';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  // Always attempt auto-registration for the interactor (Fire and forget to avoid 3s timeout)
  MemberService.autoRegister(interaction).catch(console.error);

  // 1. Handle Commands (Slash & Context Menu)
  if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
    const client = interaction.client as any;
    const command = client.commands?.get(interaction.commandName);

    if (!command) return;

    // Access Controls for Commands
    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
    const isAdmin = adminIds.includes(interaction.user.id);

    const member = await prisma.member.findUnique({ where: { discordId: interaction.user.id } });
    const isOfficial = member && member.status === 'OFFICIAL';

    const isMemberCommand = ['progression-now', 'check-status', 'list-members', 'help'].includes(interaction.commandName);
    const isAdminCommand = !isMemberCommand;

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
          '**`/wizard`** - Start the Point Wizard to award points manually via a message link.\n' +
          '**`/season`** - Manage point seasons (Start/Stop seasons).\n' +
          '**`/create-check`** - Create a new Progression Check (e.g., Weekly Raids).\n' +
          '**`/edit-check`** - Edit an existing Progression Check.\n' +
          '**`/delete-check`** - Delete a Progression Check.\n' +
          '**`/list-checks`** - View all active checks or details of a specific check.\n' +
          '**`/postpone-check`** - Mark a member as postponed for a check.\n' +
          '**`/scan-hof`** - Scan the Hall of Fame channel to bulk award points.\n' +
          '**`/sync-members`** - Sync the member database with current server roles.\n' +
          '**`/draft-announcement`** - Create an announcement draft.\n' +
          '**`/setup-help-panel`** - Deploy the help panel to a channel.\n' +
          '**Right-Click > Apps > Award Points** - Quick way to award points to an image.'
        );
      } else {
        embed.setDescription('Here are the commands available to you:\n\n' +
          '**`/progression-now`** - Check your current season points and leaderboard standing.\n' +
          '**`/check-status`** - Check your status for active progression checks (e.g., Weekly Raids).\n' +
          '**`/list-members`** - View the member roster.'
        );
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (customId === 'help_edit_member') {
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
        return interaction.reply({
          content: '❌ You are not registered in the clan member database yet.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Edit Your Profile')
        .setDescription(
          `Update your profile details or configure privacy settings below:\n\n` +
          `• **Basic Info**: Update IGN, GS Friend Code, Gender, and Country.\n` +
          `• **Birthdate & Privacy**: Set DD/MM (for Birthday bot announcements), optional birth year (YYYY), and profile search privacy.`
        )
        .setColor(0x38bdf8);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('profile_edit_basic')
          .setLabel('📝 Edit Basic Info')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('profile_edit_privacy')
          .setLabel('🔒 Edit Birthdate & Privacy')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    if (customId === 'profile_edit_basic') {
      const member = await prisma.member.findUnique({
        where: { discordId: interaction.user.id }
      });

      if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });

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
      const member = await prisma.member.findUnique({
        where: { discordId: interaction.user.id }
      });

      if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });

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

        const notePrefix = check.title.toLowerCase().includes('raid') ? 'Kills' : 'Floors';

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
        const birthdate = interaction.fields.getTextInputValue('edit_birthdate').trim();
        const birthyear = interaction.fields.getTextInputValue('edit_birthyear').trim();
        let privacy = interaction.fields.getTextInputValue('edit_privacy').trim().toUpperCase();

        // Validate birthdate (DD/MM)
        if (birthdate && !/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/.test(birthdate)) {
          return interaction.editReply('❌ Invalid birth date format. Please use **DD/MM** (e.g., `15/08`).');
        }

        // Validate birth year (YYYY)
        if (birthyear && !/^\d{4}$/.test(birthyear)) {
          return interaction.editReply('❌ Invalid birth year. Please use **YYYY** format (e.g., `2005`).');
        }

        // Validate privacy
        if (!['PUBLIC', 'OFFICIAL', 'PRIVATE'].includes(privacy)) {
          privacy = 'PUBLIC';
        }

        // Combine birthdate & birthyear
        let dbBirthdate: string | null = null;
        if (birthdate) {
          dbBirthdate = birthyear ? `${birthdate}/${birthyear}` : birthdate;
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
            { name: 'Birthdate (DD/MM)', value: birthdate || 'None' },
            { name: 'Birth Year', value: birthyear || 'None' },
            { name: 'Privacy Mode', value: privacy }
          ]
        );

        await interaction.editReply('✅ Your birthdate and privacy settings have been updated successfully!');
      } catch (err) {
        console.error('❌ Error saving privacy settings:', err);
        await interaction.editReply('❌ An error occurred while saving your privacy settings.');
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
