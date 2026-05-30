import { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import 'dotenv/config';

async function main() {
  const token = process.env['DISCORD_TOKEN'];
  if (!token) {
    console.error('❌ DISCORD_TOKEN is missing in environment.');
    return;
  }

  console.log('🤖 Logging in to Discord to deploy the welcome dashboard...');
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user?.tag}`);
    const channelId = '1505244602318454904';

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.error(`❌ Channel ${channelId} not found.`);
        client.destroy();
        return;
      }

      if (!channel.isTextBased()) {
        console.error('❌ Channel is not text-based.');
        client.destroy();
        return;
      }

      console.log(`📡 Fetching and clearing messages from workspace channel...`);
      const messages = await channel.messages.fetch({ limit: 50 });
      console.log(`📥 Fetched ${messages.size} messages. Deleting them...`);
      
      for (const [id, msg] of messages) {
        await msg.delete().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      console.log('🧹 Channel cleared.');

      console.log('📝 Sending welcome dashboard with 5 buttons...');
      const embed = new EmbedBuilder()
        .setTitle('🌟 Welcome to the DarkStar Hub!')
        .setDescription(
          "Hello everyone! I am **Liza**, the dedicated assistant for DarkStar.\n\n" +
          "I am here to help you track your progression, check leaderboard points, and manage seasonal records. " +
          "Whether you are a new recruit or a seasoned veteran, I've got you covered!\n\n" +
          "**Need help?** Click the buttons below to interact with me directly and explore my features."
        )
        .setColor(0x38bdf8)
        .setThumbnail(client.user?.displayAvatarURL() || null)
        .setFooter({ text: 'DarkStar Management System' });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('help_view_commands')
          .setLabel('🆘 View Commands')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('help_points_progression')
          .setLabel('💎 Points & Raid')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('help_clan_vision')
          .setLabel('🌌 Clan Vision')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('help_edit_member')
          .setLabel('📝 Edit Profile')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('help_ask_liza')
          .setLabel("💬 Ask DarkStar's Mascot")
          .setStyle(ButtonStyle.Danger)
      );

      await (channel as any).send({ embeds: [embed], components: [row] });
      console.log('✅ Help dashboard deployed successfully!');

    } catch (err) {
      console.error('❌ Error deploying dashboard:', err);
    } finally {
      client.destroy();
    }
  });

  await client.login(token);
}

main().catch(console.error);
