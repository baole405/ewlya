import { Events, Interaction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';
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
      return PointWizardService.handleCategorySelection(interaction);
    }
    if (customId.startsWith('calc_final_')) {
      return PointWizardService.handleFinalSelection(interaction);
    }
    if (customId.startsWith('calc_back_')) {
      return PointWizardService.handleBack(interaction);
    }
    if (customId.startsWith('calc_confirm_save_')) {
      return PointWizardService.handleConfirmSave(interaction);
    }
    if (customId.startsWith('calc_edit_list_')) {
      return PointWizardService.handleEditList(interaction);
    }
    if (customId.startsWith('calc_back_to_cart_')) {
      return PointWizardService.handleBackToCart(interaction);
    }
    if (customId.startsWith('calc_cancel')) {
      return PointWizardService.handleCancel(interaction);
    }

    if (customId.startsWith('announce_send_') || customId === 'sync_view_official') {
      return AnnouncementService.handleInteraction(interaction);
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
      // Fetch member from database
      const member = await prisma.member.findUnique({
        where: { discordId: interaction.user.id }
      });

      if (!member) {
        return interaction.reply({
          content: '❌ You are not registered in the clan member database yet.',
          ephemeral: true
        });
      }

      // Check if they are an official member or admin
      const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
      const isAdmin = adminIds.includes(interaction.user.id);
      if (!isAdmin && member.status !== 'OFFICIAL') {
        return interaction.reply({
          content: '❌ This profile editing is restricted to Official Clan Members only.',
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('member_edit_modal')
        .setTitle('Edit Member Profile');

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

      const birthdateInput = new TextInputBuilder()
        .setCustomId('edit_birthdate')
        .setLabel('Birthdate (DD/MM/YYYY)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 15/08/2005')
        .setValue(member.birthdate || '')
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
        new ActionRowBuilder<TextInputBuilder>().addComponents(birthdateInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(countryInput)
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
    const { customId } = interaction;

    if (customId.startsWith('calc_ldb_stage_')) {
      return PointWizardService.handleStageSelection(interaction);
    }
    if (customId.startsWith('calc_final_ldb_')) {
      return PointWizardService.handleFinalSelection(interaction);
    }
    if (customId.startsWith('calc_item_edit_menu_')) {
      return PointWizardService.handleSelectItemToEdit(interaction);
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

  // 5. Handle Modal Submissions
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

    if (customId === 'member_edit_modal') {
      await interaction.deferReply({ ephemeral: true });
      try {
        const ign = interaction.fields.getTextInputValue('edit_ign');
        const gsCode = interaction.fields.getTextInputValue('edit_gs_code');
        const gender = interaction.fields.getTextInputValue('edit_gender');
        const birthdate = interaction.fields.getTextInputValue('edit_birthdate');
        const country = interaction.fields.getTextInputValue('edit_country');

        // Update database
        await prisma.member.update({
          where: { discordId: interaction.user.id },
          data: {
            ign,
            gsCode: gsCode || null,
            gender: gender || null,
            birthdate: birthdate || null,
            country: country || null,
          }
        });

        await LoggerService.logAction(
          interaction.client,
          '📝 Member Profile Updated',
          `User **${interaction.user.username}** updated their profile fields.`,
          0x38bdf8,
          [
            { name: 'IGN', value: ign },
            { name: 'GS Code', value: gsCode || 'None' },
            { name: 'Gender', value: gender || 'None' },
            { name: 'Birthdate', value: birthdate || 'None' },
            { name: 'Country', value: country || 'None' }
          ]
        );

        await interaction.editReply('✅ Your profile has been updated successfully!');
      } catch (err) {
        console.error('❌ Error saving profile update:', err);
        await interaction.editReply('❌ An error occurred while saving your profile update.');
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
