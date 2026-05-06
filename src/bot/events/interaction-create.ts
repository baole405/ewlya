import { Events, Interaction } from 'discord.js';
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
}
