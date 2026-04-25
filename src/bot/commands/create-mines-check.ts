import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('create-mines-check')
  .setDescription('Start a new Mines Floor progression check (Admin Only)')
  .addIntegerOption((option) =>
    option
      .setName('target_floor')
      .setDescription('The floor number members need to reach')
      .setRequired(true)
      .setMinValue(1),
  )
  .addIntegerOption((option) =>
    option
      .setName('days')
      .setDescription('Number of days until the deadline')
      .setRequired(true)
      .setMinValue(1),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetFloor = interaction.options.getInteger('target_floor', true);
  const days = interaction.options.getInteger('days', true);

  // Check if user is in ADMIN_IDS
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // BUSINESS RULE: Check if there is already an active Mines check
    const activeCheck = await prisma.progressionCheck.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } }
        ]
      }
    });

    if (activeCheck) {
      return interaction.editReply({
        content: `❌ An active Mines check (**${activeCheck.title}**) is already in progress. Please wait for it to end or delete it before creating a new one.`
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    const title = `Mines Season - Floor ${targetFloor}`;
    const description = `Mines has started, you have ${days} days until it ends, try to reach ${targetFloor} floors!`;

    // 1. Create the Progression Check
    const officialMembers = await prisma.member.findMany({
      where: { status: 'OFFICIAL' },
    });

    const check = await prisma.$transaction(async (tx) => {
      // Save title for suggestion
      await tx.progressionTitle.upsert({
        where: { title: title },
        update: {},
        create: { title: title },
      });

      // Create Check
      const newCheck = await tx.progressionCheck.create({
        data: {
          title: title,
          description: description,
          startDate: startDate,
          endDate: endDate,
        },
      });

      // Create Requirements
      const requirement = await tx.progressionRequirement.create({
        data: {
          progressionCheckId: newCheck.id,
          title: `Reached Floor ${targetFloor}`,
          targetValue: targetFloor.toString(),
        },
      });

      // Create Statuses for each requirement per member
      if (officialMembers.length > 0) {
        await tx.memberRequirementStatus.createMany({
          data: officialMembers.map((m) => ({
            memberId: m.id,
            requirementId: requirement.id,
            isMet: false,
          })),
        });

        // Overall status
        await tx.memberProgressionStatus.createMany({
          data: officialMembers.map((m) => ({
            progressionCheckId: newCheck.id,
            memberId: m.id,
            isCompleted: false,
            note: '',
          })),
        });
      }

      return newCheck;
    });

    // 2. Announcement
    const announcementChannelId = process.env['ANNOUCEMENTS_DEVELOPER_ID'];
    if (announcementChannelId) {
      try {
        const channel = await interaction.client.channels.fetch(announcementChannelId);
        if (channel?.isTextBased()) {
          await (channel as any).send(
            `🚀 **Mines has started!**\nYou have **${days} days** until it ends, try to reach **Floor ${targetFloor}**! Good luck! ✨`,
          );
        }
      } catch (err) {
        console.error('Failed to send announcement:', err);
      }
    }

    await interaction.editReply({
      content: `✅ Successfully created Mines Floor **${targetFloor}** check for **${days}** days!`,
    });
  } catch (error) {
    console.error('Error creating mines check:', error);
    await interaction.editReply({ content: '❌ Failed to create Mines check. Please check the logs.' });
  }
}
