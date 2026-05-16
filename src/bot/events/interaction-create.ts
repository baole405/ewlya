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
      console.error(error);
      const msg = { content: 'There was an error while executing this command!', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
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
            note: `Kills: ${value}`
          },
          create: {
            progressionCheckId: check.id,
            memberId: member.id,
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
            note: `Kills: ${value}`
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
  }
}
