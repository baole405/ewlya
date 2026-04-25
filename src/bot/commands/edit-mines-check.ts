import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('edit-mines-check')
  .setDescription('Update the target floor for the latest active Mines check (Admin Only)')
  .addIntegerOption((option) =>
    option
      .setName('new_target_floor')
      .setDescription('The new floor number requirement')
      .setRequired(true)
      .setMinValue(1),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const newTargetFloor = interaction.options.getInteger('new_target_floor', true);

  // Check if user is in ADMIN_IDS
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Find the latest active Mines check
    const check = await prisma.progressionCheck.findFirst({
      where: {
        title: { contains: 'Mines Season' },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: { requirements: true },
    });

    if (!check) {
      return interaction.editReply({ content: '❌ No active Mines check found to edit.' });
    }

    const oldTargetFloor = check.requirements[0]?.targetValue || '100';

    await prisma.$transaction([
      prisma.progressionCheck.update({
        where: { id: check.id },
        data: {
          title: `Mines Season - Floor ${newTargetFloor}`,
        },
      }),
      prisma.progressionRequirement.updateMany({
        where: { progressionCheckId: check.id },
        data: {
          title: `Reached Floor ${newTargetFloor}`,
          targetValue: newTargetFloor.toString(),
        },
      }),
    ]);

    // Announcement
    const announcementChannelId = process.env['ANNOUCEMENTS_DEVELOPER_ID'];
    if (announcementChannelId) {
      try {
        const channel = await interaction.client.channels.fetch(announcementChannelId);
        if (channel?.isTextBased()) {
          await (channel as any).send(
            `🔄 **Mines Update!**\nTarget floor has been changed from **${oldTargetFloor}** to **${newTargetFloor}**. 🎯`,
          );
        }
      } catch (err) {
        console.error('Failed to send announcement:', err);
      }
    }

    await interaction.editReply({
      content: `✅ Successfully updated Mines target floor to **${newTargetFloor}**!`,
    });
  } catch (error) {
    console.error('Error editing mines check:', error);
    await interaction.editReply({ 
      content: `❌ Failed to update Mines check: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}
