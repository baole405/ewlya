import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { CommandTrackerService } from '../services/command-tracker.service';

export const data = new SlashCommandBuilder()
  .setName('command-stats')
  .setDescription('View usage statistics and analytics for all bot commands (Admin Only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
  if (!adminIds.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Permission denied. Admin only.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const client = interaction.client as any;
  const registeredCommandNames: string[] = client.commands ? Array.from(client.commands.keys()) : [];

  const stats = CommandTrackerService.getStats();
  const totalInvocations = CommandTrackerService.getTotalInvocations();
  const zeroUsage = CommandTrackerService.getZeroUsageCommands(registeredCommandNames);

  const embed = new EmbedBuilder()
    .setTitle('📊 EWLYA Command Usage & Analytics')
    .setColor(0x38bdf8)
    .setDescription(
      `Total command invocations recorded: **${totalInvocations}**\n` +
      `Registered commands in system: **${registeredCommandNames.length}**`
    )
    .setTimestamp();

  if (stats.length === 0) {
    embed.addFields({
      name: '📈 Top Used Commands',
      value: 'No command invocation data recorded since tracking initialized.'
    });
  } else {
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const topLines = stats.slice(0, 10).map((item, idx) => {
      const medal = medals[idx] || '▫️';
      const pct = totalInvocations > 0 ? ((item.count / totalInvocations) * 100).toFixed(1) : '0';
      return `${medal} **\`/${item.commandName}\`**: **${item.count}** times (${pct}%) • *Latest: ${item.lastUsedBy}*`;
    });

    embed.addFields({
      name: '🏆 Most Used Commands',
      value: topLines.join('\n') || 'None'
    });
  }

  if (zeroUsage.length > 0) {
    const zeroList = zeroUsage.map(cmd => `\`/${cmd}\``).join(', ');
    embed.addFields({
      name: `💤 Unused Commands (${zeroUsage.length})`,
      value: zeroList.length > 1024 ? zeroList.slice(0, 1020) + '...' : zeroList
    });
  }

  embed.setFooter({
    text: 'Command usage analytics • DarkStar Management'
  });

  await interaction.editReply({ embeds: [embed] });
}
