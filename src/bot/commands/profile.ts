import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../../database/prisma';
import { MemberService } from '../services/member.service';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('View or edit your DarkStar Clan profile')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Check another member\'s profile (leave blank for your own)')
      .setRequired(false)
  )
  .addBooleanOption(option =>
    option.setName('public')
      .setDescription('Show your profile publicly in this channel (Default: false / private to you)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const isSelf = interaction.user.id === targetUser.id;
  const isPublic = interaction.options.getBoolean('public') ?? false;

  // If viewing self and not requested public, keep it ephemeral so edit buttons stay private
  const ephemeral = isSelf ? !isPublic : false;

  await interaction.deferReply({ ephemeral });

  try {
    let targetMember = await prisma.member.findUnique({
      where: { discordId: targetUser.id }
    });

    if (!targetMember && isSelf) {
      targetMember = await MemberService.ensureMemberExists(interaction.user, interaction.guild);
    }

    if (!targetMember) {
      return interaction.editReply(`❌ User <@${targetUser.id}> is not registered in the clan database.`);
    }

    // Check executor permissions
    const executorMember = await prisma.member.findUnique({
      where: { discordId: interaction.user.id }
    });

    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(Boolean);
    const isExecutorAdmin = adminIds.includes(interaction.user.id);
    const isExecutorOfficial = executorMember?.status === 'OFFICIAL';

    // Check privacy settings
    const privacy = (targetMember.profilePrivacy || 'PUBLIC').toUpperCase();

    if (!isSelf && !isExecutorAdmin) {
      if (privacy === 'PRIVATE') {
        return interaction.editReply('❌ This member\'s profile is private.');
      }
      if (privacy === 'OFFICIAL' || privacy === 'OFFICIAL_ONLY') {
        if (!isExecutorOfficial) {
          return interaction.editReply('❌ This profile is only visible to Official Clan Members.');
        }
      }
    }

    // Format birthdate and birth year safely
    let birthDateStr = 'Not provided';
    let birthYearStr = 'Hidden / Not provided';

    if (targetMember.birthdate) {
      const parts = targetMember.birthdate.split('/');
      if (parts.length >= 2) {
        birthDateStr = `${parts[0]}/${parts[1]}`;
        birthYearStr = parts[2] || 'Hidden / Not provided';
      } else {
        birthDateStr = targetMember.birthdate;
      }
    }

    // Build the profile embed
    const embed = new EmbedBuilder()
      .setTitle(`👤 ${isSelf ? 'Your Profile' : 'Member Profile'}: ${targetMember.nickname || targetMember.ign}`)
      .setColor(targetMember.status === 'OFFICIAL' ? 0x3b82f6 : 0x10b981)
      .setThumbnail(targetMember.avatarUrl || targetUser.displayAvatarURL() || null)
      .addFields(
        { name: '🎮 IGN', value: targetMember.ign || 'Not set', inline: true },
        { name: '🆔 Discord', value: `<@${targetMember.discordId}>`, inline: true },
        { name: '🎫 GS Friend Code', value: targetMember.gsCode || 'Not provided', inline: true },
        { name: '🎂 Birthday (DD/MM)', value: birthDateStr, inline: true },
        { name: '📅 Birth Year', value: birthYearStr, inline: true },
        { name: '🧬 Gender', value: targetMember.gender || 'Not provided', inline: true },
        { name: '🗺️ Country', value: targetMember.country || 'Not provided', inline: true },
        { name: '📊 Clan Status', value: targetMember.status, inline: true },
        { name: '🔒 Privacy Level', value: targetMember.profilePrivacy || 'PUBLIC', inline: true }
      )
      .setFooter({ text: 'DarkStar Clan Member Database' })
      .setTimestamp();

    if (isSelf) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('profile_edit_basic')
          .setLabel('📝 Edit Basic Info')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('profile_edit_privacy')
          .setLabel('🔒 Edit Birthdate & Privacy')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('profile_view_self')
          .setLabel('👁️ Refresh Profile')
          .setStyle(ButtonStyle.Success)
      );

      return await interaction.editReply({ embeds: [embed], components: [row] });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error executing /profile command:', error);
    await interaction.editReply({ content: '❌ An error occurred while retrieving the profile.' });
  }
}
