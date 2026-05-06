import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('create-mines-check')
  .setDescription('Start a new Mines Floor progression check (Admin Only)')
  .addStringOption(option => 
    option.setName('season')
      .setDescription('The name of the season (e.g., Spring 2024)')
      .setRequired(true)
  )
  .addIntegerOption(option => 
    option.setName('target_floor')
      .setDescription('The floor level to reach (e.g., 100)')
      .setRequired(true)
  )
  .addIntegerOption(option => 
    option.setName('days')
      .setDescription('How many days until the check ends (e.g., 30)')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  const season = interaction.options.getString('season', true);
  const targetFloor = interaction.options.getInteger('target_floor', true);
  const days = interaction.options.getInteger('days', true);

  await interaction.deferReply({ ephemeral: true });

  try {
    // BUSINESS RULE: Check for ANY non-deleted progression check
    const activeCheck = await prisma.progressionCheck.findFirst({
      where: { deletedAt: null }
    });

    if (activeCheck) {
      return interaction.editReply({
        content: `❌ A Mines check (**${activeCheck.title}**) is already in the system. Please delete it using \`/delete-mines\` (ID: \`${activeCheck.id}\`) before creating a new one.`
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    // Format dates for display: xx/Month (e.g., 25/April)
    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      return `${day}/${month}`;
    };

    const title = `[${season}] Mines Floor ${targetFloor}`;
    const description = `Mines has started, you have ${days} days until it ends, try to reach ${targetFloor} floors!`;

    // 1. Create the Progression Check
    const check = await prisma.progressionCheck.create({
      data: {
        title,
        description,
        startDate,
        endDate,
        requirements: {
          create: {
            title: `Reach Floor ${targetFloor}`,
            description: `Required to reach floor ${targetFloor} within the time limit.`
          }
        }
      },
      include: {
        requirements: true
      }
    });

    // 2. Initialize status for all Official members
    const officialMembers = await prisma.member.findMany({
      where: { status: 'OFFICIAL' },
    });

    if (officialMembers.length > 0) {
      await prisma.memberProgressionStatus.createMany({
        data: officialMembers.map((m) => ({
          progressionCheckId: check.id,
          memberId: m.id,
          isCompleted: false,
        })),
      });

      // Also create requirement statuses
      for (const req of check.requirements) {
        await prisma.memberRequirementStatus.createMany({
          data: officialMembers.map((m) => ({
            requirementId: req.id,
            memberId: m.id,
            isMet: false,
          })),
        });
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Mines Progression Created')
      .setColor(0x22c55e)
      .addFields(
        { name: 'Season', value: season, inline: true },
        { name: 'Target', value: `Floor ${targetFloor}`, inline: true },
        { name: 'Duration', value: `${days} days`, inline: true },
        { name: 'Start Date', value: `📅 **${formatDate(startDate)}**`, inline: true },
        { name: 'End Date', value: `🏁 **${formatDate(endDate)}**`, inline: true },
        { name: 'Members', value: `👥 ${officialMembers.length} official members added`, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to create Mines check.');
  }
}
