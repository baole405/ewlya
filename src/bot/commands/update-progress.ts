import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, AutocompleteInteraction } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('update-progress')
  .setDescription('Set progress (e.g., boss kills) for a member in the active progression check (Admin Only)')
  .addStringOption(option => 
    option.setName('member')
      .setDescription('The member to update')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addIntegerOption(option => 
    option.setName('value')
      .setDescription('The actual number achieved (e.g., number of boss kills)')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedOption = interaction.options.getFocused(true);
  
  if (focusedOption.name === 'member') {
    const members = await prisma.member.findMany({
      where: {
        status: 'OFFICIAL',
        OR: [
          { nickname: { contains: focusedOption.value, mode: 'insensitive' } },
          { ign: { contains: focusedOption.value, mode: 'insensitive' } }
        ]
      },
      take: 25
    });

    await interaction.respond(
      members.map(m => ({ name: m.nickname, value: m.id }))
    );
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  const memberId = interaction.options.getString('member', true);
  const value = interaction.options.getInteger('value', true);

  await interaction.deferReply({ ephemeral: true });

  try {
    const activeCheck = await prisma.progressionCheck.findFirst({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeCheck) {
      return interaction.editReply('❌ No active progression check found.');
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return interaction.editReply('❌ Member not found.');
    }

    // Retrieve target value directly from the associated ProgressionRequirement in database
    const requirement = await prisma.progressionRequirement.findFirst({
      where: { progressionCheckId: activeCheck.id }
    });

    let targetValue = 0;
    if (requirement) {
      const match = requirement.title.match(/\d+/);
      if (match) {
        targetValue = parseInt(match[0], 10);
      }
    }

    const isCompleted = value >= targetValue;

    // Update status in database
    await prisma.memberProgressionStatus.upsert({
      where: {
        progressionCheckId_memberId: {
          progressionCheckId: activeCheck.id,
          memberId: member.id
        }
      },
      update: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        note: `Kills: ${value}`
      },
      create: {
        progressionCheckId: activeCheck.id,
        memberId: member.id,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        note: `Kills: ${value}`
      }
    });

    const statusEmoji = isCompleted ? '✅' : '❌';
    const embed = new EmbedBuilder()
      .setTitle('📊 Progress Updated')
      .setDescription(`Successfully updated progression for **${member.nickname}**`)
      .setColor(isCompleted ? 0x22c55e : 0xef4444)
      .addFields(
        { name: 'Check', value: activeCheck.title, inline: false },
        { name: 'Value Set', value: `**${value}** / ${targetValue}`, inline: true },
        { name: 'Status', value: `${statusEmoji} ${isCompleted ? 'Completed' : 'Not Complete'}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error updating progress:', error);
    await interaction.editReply('❌ Failed to update member progress.');
  }
}
