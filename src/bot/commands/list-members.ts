import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('list-members')
  .setDescription('Show current list of Official Clan members (Admin Only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',');
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const officials = await prisma.member.findMany({
      where: { status: 'OFFICIAL' },
      orderBy: { nickname: 'asc' },
      select: { nickname: true, ign: true }
    });

    if (officials.length === 0) {
      return interaction.editReply('📭 No official members found in Database. Use `/sync-members` first.');
    }

    const list = officials.map((m, i) => `${(i + 1).toString().padStart(2, '0')}. **${m.nickname}** (${m.ign})`).join('\n');
    
    // Giới hạn 2000 ký tự của Discord
    const truncatedList = list.length > 1900 ? list.substring(0, 1900) + '... (too many to show)' : list;

    const embed = new EmbedBuilder()
      .setTitle('⭐ Official Clan Roster')
      .setDescription(truncatedList)
      .setColor(0x38bdf8)
      .setFooter({ text: `Total: ${officials.length} members` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Failed to fetch member list.');
  }
}
