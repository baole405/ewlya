import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Interaction,
  MessageReaction,
  PartialMessageReaction,
  User,
  PartialUser,
  Collection,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import * as interactionCreate from './events/interaction-create';
import * as messageReactionAdd from './events/message-reaction-add';
import * as messageCreate from './events/message-create';

@Injectable()
export class DiscordBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordBotService.name);
  private client: Client;
  private commands = new Collection<string, any>();
  
  // Lease-based automatic priority management
  private leaseCheckInterval: NodeJS.Timeout | null = null;
  private localBotLeaseExpiry: number | null = null;
  private isConnecting = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
      ],
      partials: [Partials.Message, Partials.Reaction, Partials.User],
    });
  }

  async onModuleInit() {
    if (process.env['DISABLE_BOT_CLIENT'] === 'true') {
      this.logger.log('🚫 Bot Client is disabled in this container (DISABLE_BOT_CLIENT=true). API-only mode.');
      return;
    }

    const token = process.env['DISCORD_TOKEN'];
    if (!token) {
      this.logger.warn('⚠️ DISCORD_TOKEN not found — Bot will NOT start. API-only mode.');
      return;
    }

    // Load command modules and map them to the client
    await this.initializeCommands();
    this.registerEvents();

    const isLocalBot = process.env['IS_LOCAL_BOT'] === 'true';
    const productionUrl = process.env['PRODUCTION_URL'];

    if (isLocalBot && productionUrl) {
      this.logger.log(`📡 Local bot mode active. Requesting lease from production bot at ${productionUrl}...`);
      await this.sendLeasePing();
      
      // Start periodic lease renewal
      setInterval(() => this.sendLeasePing(), 30000);
      
      // Delay connection to give production bot time to disconnect
      this.logger.log('⏳ Waiting 3 seconds for production bot to disconnect...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    try {
      this.isConnecting = true;
      await this.client.login(token);
      this.logger.log('🤖 Discord Bot logged in successfully!');
      
      // Register slash commands after client fetches guilds
      setTimeout(() => this.registerSlashCommands(), 2000);
    } catch (err) {
      this.logger.error('❌ Discord Bot login failed:', err);
    } finally {
      this.isConnecting = false;
    }

    // Start background lease checker if running on production
    if (!isLocalBot) {
      this.startLeaseCheckScheduler();
    }
  }

  async onModuleDestroy() {
    if (this.leaseCheckInterval) {
      clearInterval(this.leaseCheckInterval);
    }
    if (this.client) {
      this.client.destroy();
      this.logger.log('🔌 Discord Bot disconnected.');
    }
  }

  private async initializeCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    if (!fs.existsSync(commandsPath)) {
      this.logger.warn(`⚠️ Commands directory not found at: ${commandsPath}`);
      return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    this.logger.log(`📂 Found ${commandFiles.length} command files.`);

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        const command = await import(pathToFileURL(filePath).href);
        if ('data' in command && 'execute' in command) {
          this.commands.set(command.data.name, command);
          this.logger.log(`✅ Loaded command: /${command.data.name}`);
        } else {
          this.logger.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
      } catch (err) {
        this.logger.error(`❌ Failed to load command from ${file}:`, err);
      }
    }
    (this.client as any).commands = this.commands;
  }

  private async registerSlashCommands() {
    const token = process.env['DISCORD_TOKEN'];
    const clientId = process.env['DISCORD_CLIENT_ID'];

    if (!token || !clientId) {
      this.logger.warn('⚠️ Missing token or clientId for slash command registration.');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(token);
    const body = Array.from(this.commands.values()).map((c) => c.data.toJSON());

    try {
      // Clear global commands to avoid double-registration bugs
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      this.logger.log('🧹 Cleared global commands.');

      const guilds = await this.client.guilds.fetch();
      this.logger.log(`🚀 Registering ${body.length} Slash Commands for ${guilds.size} guilds...`);
      for (const [guildId] of guilds) {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
        this.logger.log(`✅ Registered for Guild: ${guildId}`);
      }
      this.logger.log('✅ All Slash Commands registered successfully!');
    } catch (error) {
      this.logger.error('❌ Failed to register Slash Commands:', error);
    }
  }

  private registerEvents() {
    // Ready event
    this.client.on(Events.ClientReady, async (readyClient) => {
      this.logger.log(`✅ Logged in as ${readyClient.user.tag}!`);
      this.logger.log(`📡 HOF Channel: ${process.env['HOF_CHANNEL_ID']}`);
      this.logger.log(`📡 Test Channel: ${process.env['TEST_CHANNEL_ID']}`);
      this.logger.log('🚀 Bot is fully operational and ready for use.');

      // Auto-deploy help guide in liza-guide channel if empty
      const guideChannelId = '1505244602318454904';
      try {
        const channel = await readyClient.channels.fetch(guideChannelId);
        if (channel && channel.isTextBased()) {
          const messages = await (channel as any).messages.fetch({ limit: 5 });
          if (messages.size === 0) {
            this.logger.log(`📝 liza-guide channel (${guideChannelId}) is empty. Auto-deploying help guide...`);
            
            const embed = new EmbedBuilder()
              .setTitle('🌟 Welcome to the DarkStar Hub!')
              .setDescription(
                "Hello everyone! I am **Liza**, the dedicated assistant for DarkStar.\n\n" +
                "I am here to help you track your progression, check leaderboard points, and manage seasonal records. " +
                "Whether you are a new recruit or a seasoned veteran, I've got you covered!\n\n" +
                "**Need help?** Click the button below to view the commands available to you."
              )
              .setColor(0x38bdf8)
              .setThumbnail(readyClient.user?.displayAvatarURL() || null)
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
            this.logger.log('✅ Help guide deployed successfully to liza-guide.');
          }
        }
      } catch (err) {
        this.logger.error(`❌ Failed to check or deploy guide to liza-guide (${guideChannelId}):`, err);
      }
    });

    // Interaction (slash commands & select menus)
    this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
      try {
        await (interactionCreate as any).execute(interaction);
      } catch (err) {
        this.logger.error('❌ Error in InteractionCreate:', err);
      }
    });

    // Reaction (✅ reaction triggers point flow)
    this.client.on(
      Events.MessageReactionAdd,
      async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
        try {
          await (messageReactionAdd as any).execute(reaction, user);
        } catch (err) {
          this.logger.error('❌ Error in MessageReactionAdd:', err);
        }
      },
    );

    // Message (mentions & commands)
    this.client.on(Events.MessageCreate, async (message) => {
      try {
        await (messageCreate as any).execute(message);
      } catch (err) {
        this.logger.error('❌ Error in MessageCreate:', err);
      }
    });
  }

  // Lease methods
  public registerLease() {
    this.localBotLeaseExpiry = Date.now() + 45000; // lease is active for 45s
    if (this.client && this.client.readyAt) {
      this.logger.log('⏳ Local bot heartbeat received. Disconnecting production bot from Gateway to avoid collision...');
      try {
        this.client.destroy();
      } catch (err) {
        this.logger.error('❌ Failed to destroy production bot connection gracefully:', err);
      }
    }
  }

  private startLeaseCheckScheduler() {
    if (this.leaseCheckInterval) return;
    this.leaseCheckInterval = setInterval(async () => {
      if (this.localBotLeaseExpiry && Date.now() > this.localBotLeaseExpiry) {
        this.logger.log('⏰ Local bot lease expired. Resuming production bot...');
        this.localBotLeaseExpiry = null;
        await this.resumeClient();
      }
    }, 15000);
  }

  private async resumeClient() {
    if (this.isConnecting || (this.client && this.client.readyAt)) {
      return;
    }

    const token = process.env['DISCORD_TOKEN'];
    if (!token) return;

    this.logger.log('🚀 Resuming production Discord bot client (connecting to Gateway)...');
    try {
      this.isConnecting = true;
      await this.client.login(token);
      this.logger.log('🤖 Production Discord bot client reconnected successfully.');
    } catch (err) {
      this.logger.error('❌ Failed to reconnect production bot:', err);
    } finally {
      this.isConnecting = false;
    }
  }

  private async sendLeasePing() {
    const productionUrl = process.env['PRODUCTION_URL'];
    const token = process.env['DISCORD_TOKEN'];
    if (!productionUrl || !token) return;

    try {
      const response = await fetch(`${productionUrl}/api/bot/lease-pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-token': token,
        },
      });
      if (response.ok) {
        this.logger.log('✅ Sent heartbeat to production bot. Lease renewed.');
      } else {
        this.logger.warn(`⚠️ Failed to lease-pause production bot: ${response.statusText}`);
      }
    } catch (err) {
      this.logger.error('❌ Error sending lease ping to production bot:', err);
    }
  }

  getClient(): Client {
    return this.client;
  }

  async sendMessage(channelId: string, content: string | any) {
    if (!this.client.isReady()) {
      this.logger.warn('⚠️ Client not ready, skipping message send.');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel?.isTextBased()) {
        await (channel as any).send(content);
      }
    } catch (err) {
      this.logger.error(`❌ Failed to send message to channel ${channelId}:`, err);
    }
  }
}
