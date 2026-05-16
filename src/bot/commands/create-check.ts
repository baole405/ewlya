import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('create-check')
  .setDescription('Start a new Progression Check (Mines/Raids) (Admin Only)')
  .addStringOption(option => 
    option.setName('season')
      .setDescription('The name of the season (e.g., Spring 2024)')
      .setRequired(true)
  )
  .addStringOption(option => 
    option.setName('type')
      .setDescription('Type of progression (e.g., Mines Floor, Raids Count)')
      .setRequired(true)
      .addChoices(
        { name: 'Mines Floor', value: 'Mines Floor' },
        { name: 'Raids Count', value: 'Raids Count' },
        { name: 'Other', value: 'Progression' }
      )
  )
  .addIntegerOption(option => 
    option.setName('target_value')
      .setDescription('The target number to reach (e.g., 100)')
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
  const type = interaction.options.getString('type', true);
  const targetValue = interaction.options.getInteger('target_value', true);
  const days = interaction.options.getInteger('days', true);

  await interaction.deferReply({ ephemeral: true });

  try {
    // BUSINESS RULE: Check for ANY non-deleted ACTIVE progression check
    const activeCheck = await prisma.progressionCheck.findFirst({
      where: { deletedAt: null, status: 'ACTIVE' }
    });

    if (activeCheck) {
      return interaction.editReply({
        content: `❌ An **ACTIVE** progression check (**${activeCheck.title}**) is already running. Please postpone or close it using \`/edit-check\` (ID: \`${activeCheck.id}\`) before starting a new one.`
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      return `${day}/${month}`;
    };

    const title = `[${season}] ${type} ${targetValue}`;
    const description = `${type} has started, you have ${days} days until it ends, try to reach the target of ${targetValue}!`;

    // 1. Create the Progression Check
    const check = await prisma.progressionCheck.create({
      data: {
        title,
        description,
        startDate,
        endDate,
        status: 'ACTIVE',
        requirements: {
          create: {
            title: `Reach ${targetValue}`,
            description: `Required to reach ${targetValue} within the time limit.`
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
      .setTitle('✅ Progression Check Created')
      .setColor(0x22c55e)
      .addFields(
        { name: 'Season', value: season, inline: true },
        { name: 'Target', value: `${type} ${targetValue}`, inline: true },
        { name: 'Duration', value: `${days} days`, inline: true },
        { name: 'Start Date', value: `📅 **${formatDate(startDate)}**`, inline: true },
        { name: 'End Date', value: `🏁 **${formatDate(endDate)}**`, inline: true },
        { name: 'Members', value: `👥 ${officialMembers.length} official members added`, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to create progression check.');
  }
}
