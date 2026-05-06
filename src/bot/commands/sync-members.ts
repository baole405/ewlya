import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('sync-members')
  .setDescription('Sync members to DB (Defaults to Dark Stars)')
  .addRoleOption(option => 
    option.setName('role')
      .setDescription('The official role (Optional, defaults to Dark Stars)')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const guild = interaction.guild;
    if (!guild) return interaction.editReply('❌ Must be used in a server.');

    // Tìm role: Ưu tiên role được chọn, nếu không tìm role tên "Dark Stars"
    let targetRole = interaction.options.getRole('role');
    if (!targetRole) {
      targetRole = guild.roles.cache.find(r => r.name === 'Dark Stars') || null;
    }

    if (!targetRole) {
      return interaction.editReply('❌ Please specify a role or ensure a "Dark Stars" role exists.');
    }

    const members = await guild.members.fetch();
    let officialCount = 0;
    let botCount = 0;

    for (const [id, member] of members) {
      if (member.user.bot) {
        botCount++;
        continue;
      }

      const isOfficial = member.roles.cache.has(targetRole.id);
      const isAdmin = adminIds.includes(id); // Kiểm tra xem có phải Bahan hay Grimex không
      const roleNames = member.roles.cache.map(r => r.name).filter(n => n !== '@everyone');

      await prisma.member.upsert({
        where: { discordId: id },
        update: {
          nickname: member.displayName,
          avatarUrl: member.user.displayAvatarURL(),
          status: isOfficial ? 'OFFICIAL' : 'TRIAL',
          role: isAdmin ? 'ADMIN' : 'MEMBER', // Gán quyền ADMIN trong DB
          roles: roleNames,
        },
        create: {
          discordId: id,
          nickname: member.displayName,
          ign: member.displayName,
          avatarUrl: member.user.displayAvatarURL(),
          status: isOfficial ? 'OFFICIAL' : 'TRIAL',
          role: isAdmin ? 'ADMIN' : 'MEMBER',
          roles: roleNames,
        },
      });

      if (isOfficial) officialCount++;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔄 Server Sync Complete')
      .setColor(0x22c55e)
      .setDescription(`All members with role **${targetRole.name}** are now synchronized.`)
      .addFields(
        { name: '⭐ Total Official', value: `**${officialCount}** members`, inline: false }
      )
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('sync_view_official')
        .setLabel('View Official List')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });

  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Sync failed.');
  }
}
