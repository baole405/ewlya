import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('check-profile')
  .setDescription("Check another member's profile details")
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The member whose profile you want to check')
      .setRequired(false)
  );

const ALLOWED_CHANNELS = [
  '1179416080528179352', // general-channel
  '1180532162919936092', // clan-chat-channel
  '1424269975698407454'  // test-channel (for development)
];

export async function execute(interaction: ChatInputCommandInteraction) {
  // Enforce channel restrictions
  if (!ALLOWED_CHANNELS.includes(interaction.channelId)) {
    return interaction.reply({
      content: '❌ This command can only be used in <#1179416080528179352> (general) or <#1180532162919936092> (clan-chat).',
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: false });

  try {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    // Fetch target member profile
    const targetMember = await prisma.member.findUnique({
      where: { discordId: targetUser.id }
    });

    if (!targetMember) {
      return interaction.editReply(`❌ User <@${targetUser.id}> is not registered in the clan database.`);
    }

    // Check executor permissions
    const executorMember = await prisma.member.findUnique({
      where: { discordId: interaction.user.id }
    });

    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(id => id);
    const isExecutorAdmin = adminIds.includes(interaction.user.id);
    const isExecutorOfficial = executorMember?.status === 'OFFICIAL';
    const isSelf = interaction.user.id === targetUser.id;

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
      .setTitle(`👤 Member Profile: ${targetMember.nickname || targetMember.ign}`)
      .setColor(isExecutorOfficial ? 0x3b82f6 : 0x10b981) // blue for official, green for others
      .setThumbnail(targetMember.avatarUrl || targetUser.displayAvatarURL() || null)
      .addFields(
        { name: '🎮 IGN', value: targetMember.ign, inline: true },
        { name: '🆔 Discord', value: `<@${targetMember.discordId}>`, inline: true },
        { name: '🎫 GS Friend Code', value: targetMember.gsCode || 'Not provided', inline: true },
        { name: '🎂 Birthday (DD/MM)', value: birthDateStr, inline: true },
        { name: '📅 Birth Year', value: birthYearStr, inline: true },
        { name: '🧬 Gender', value: targetMember.gender || 'Not provided', inline: true },
        { name: '🗺️ Country', value: targetMember.country || 'Not provided', inline: true },
        { name: '📊 Clan Status', value: targetMember.status, inline: true },
        { name: '🔒 Privacy Level', value: targetMember.profilePrivacy || 'PUBLIC', inline: true }
      )
      .setFooter({ text: `DarkStar Clan Member Database` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error executing /check-profile command:', error);
    await interaction.editReply({ content: '❌ An error occurred while retrieving the profile.' });
  }
}
