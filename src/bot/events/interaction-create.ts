import { Events, Interaction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';
import { MemberService } from '../services/member.service';
import { PointWizardService } from '../services/point-wizard.service';
import { AnnouncementService } from '../services/announcement.service';
import { LoggerService } from '../services/logger.service';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  // Always attempt auto-registration for the interactor
  await MemberService.autoRegister(interaction);

  // 1. Handle Commands (Slash & Context Menu)
  if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
    const client = interaction.client as any;
    const command = client.commands?.get(interaction.commandName);

    if (!command) return;

    // AUDIT LOG
    await LoggerService.logAction(
      interaction.client,
      '⚙️ Command Executed',
      `User **${interaction.user.username}** used \`/${interaction.commandName}\``,
      0x38bdf8,
      interaction.options.data.map(opt => ({
        name: opt.name,
        value: String(opt.value)
      }))
    );

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
