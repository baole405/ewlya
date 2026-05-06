import { ButtonInteraction, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';
import { LoggerService } from './logger.service';

export class AnnouncementService {
  /**
   * Routes the button interaction for announcements
   */
  static async handleInteraction(interaction: ButtonInteraction) {
    const { customId } = interaction;
    await interaction.deferReply({ ephemeral: true });

    const embed = interaction.message.embeds[0];
    if (!embed) return interaction.editReply('❌ Draft content lost.');

    const testChannelId = process.env['TEST_CHANNEL_ID'];
    const officialChannelId = process.env['ANNOUCEMENTS_CHANNELS_ID'];

    try {
      if (customId === 'announce_send_test') {
        if (!testChannelId) throw new Error('TEST_CHANNEL_ID not set');
        const channel = await interaction.guild?.channels.fetch(testChannelId);
        if (channel?.isTextBased()) {
          await (channel as any).send({ content: '🧪 **Test Preview:**', embeds: [EmbedBuilder.from(embed)] });
          await interaction.editReply(`✅ Sent to Test Channel (<#${testChannelId}>)`);
        }
      } 
      else if (customId === 'announce_send_official') {
        if (!officialChannelId) throw new Error('ANNOUCEMENTS_CHANNELS_ID not set');
        const channel = await interaction.guild?.channels.fetch(officialChannelId);
        if (channel?.isTextBased()) {
          const role = interaction.guild?.roles.cache.find(r => r.name === 'Dark Stars');
          const mention = role ? `<@&${role.id}>` : '@Dark Stars';

          await (channel as any).send({ 
            content: `🔔 **ATTENTION** ${mention}\nNew Announcement Below:`, 
            embeds: [EmbedBuilder.from(embed).setFooter({ text: `Published by ${interaction.user.username}` })] 
          });
          
          await interaction.editReply(`🚀 **SUCCESS!** Announcement published to <#${officialChannelId}>`);
          await interaction.message.edit({ components: [] });

          await LoggerService.logAction(
            interaction.client,
            '📢 Announcement Published',
            `Admin **${interaction.user.username}** published an announcement.`,
            0x38bdf8,
            [{ name: 'Channel', value: `<#${officialChannelId}>` }]
          );
        }
      }
      else if (customId === 'sync_view_official') {
        const officials = await prisma.member.findMany({
          where: { status: 'OFFICIAL' },
          select: { nickname: true }
        });

        if (officials.length === 0) return interaction.editReply('📭 No official members found in Database.');

        const list = officials.map((m, i) => `${i + 1}. ${m.nickname}`).join('\n');
        const truncatedList = list.length > 1900 ? list.substring(0, 1900) + '... (and more)' : list;

        const listEmbed = new EmbedBuilder()
          .setTitle('⭐ Official Members List')
          .setDescription(`\`\`\`\n${truncatedList}\n\`\`\``)
          .setColor(0x22c55e)
          .setFooter({ text: `Total: ${officials.length} members` });

        await interaction.editReply({ embeds: [listEmbed] }); // Was reply, but we deferred so we editReply
      }
    } catch (err) {
      console.error('Announcement Error:', err);
      await interaction.editReply(`❌ Error: ${err}`);
    }
  }
}
