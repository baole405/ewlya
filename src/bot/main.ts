import { Client, GatewayIntentBits, Partials, Collection, REST, Routes } from 'discord.js';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

// Import Events
import * as interactionCreate from './events/interaction-create';
import * as messageReactionAdd from './events/message-reaction-add';
import * as messageReactionRemove from './events/message-reaction-remove';
import * as messageCreate from './events/message-create';
import * as ready from './events/ready';

/**
 * DarkStar Discord Bot - Modular Initialization with Dynamic Loading
 */
class DarkStarBot {
  private client: Client;
  private commands = new Collection<string, any>();

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
      ],
      partials: [Partials.Message, Partials.Reaction, Partials.User, Partials.Channel],
    });

    this.initializeCommands();
    this.initializeEvents();
  }

  private async initializeCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    // In dev (tsx), we look for .ts. In prod (node), we look for .js
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    console.log(`📂 Found ${commandFiles.length} command files.`);

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      // Use dynamic import with pathToFileURL to support Windows absolute paths
      const command = await import(pathToFileURL(filePath).href);
      
      if ('data' in command && 'execute' in command) {
        this.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: /${command.data.name}`);
      } else {
        console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
    (this.client as any).commands = this.commands;
  }

  private initializeEvents() {
    // Note: ready is handled separately in start() if needed, but we register it here too
    const events = [ready, messageReactionAdd, messageReactionRemove, interactionCreate, messageCreate];
    
    for (const event of events) {
      const handler = async (...args: any[]) => {
        try {
          // Some event modules export 'execute', others might be named differently
          const execute = (event as any).execute;
          if (execute) {
            await execute(...args);
          }
        } catch (err) {
          console.error(`❌ Error in event handling:`, err);
        }
      };

      const eventName = (event as any).name || (event as any).Events || (Object.values(event).find(v => typeof v === 'string'));
      
      // We'll use the hardcoded names from discord.js for safety if the above fails
      // But for our modular setup, interaction-create etc are fine.
    }

    // Standard event registration
    this.client.on('ready', (c) => (ready as any).execute(c));
    this.client.on('interactionCreate', (i) => (interactionCreate as any).execute(i));
    this.client.on('messageCreate', (m) => (messageCreate as any).execute(m));
    this.client.on('messageReactionAdd', (r, u) => (messageReactionAdd as any).execute(r, u));
    this.client.on('messageReactionRemove', (r, u) => (messageReactionRemove as any).execute(r, u));
    
    console.log(`📂 Registered 4 core event handlers.`);
  }

  private async registerSlashCommands() {
    const token = process.env['DISCORD_TOKEN'];
    const clientId = process.env['DISCORD_CLIENT_ID'];

    if (!token || !clientId) {
      console.error('❌ Missing token or clientId for slash command registration.');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(token);
    const body = Array.from(this.commands.values()).map((c) => c.data.toJSON());

    try {
      // Clear Global Commands first to avoid conflicts
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      console.log('🧹 Cleared global commands.');

      const guilds = await this.client.guilds.fetch();
      console.log(`🚀 Registering ${body.length} Slash Commands for ${guilds.size} guilds...`);
      for (const [guildId] of guilds) {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
        console.log(`✅ Registered for Guild: ${guildId}`);
      }
      console.log('✅ All Slash Commands registered successfully!');
    } catch (error) {
      console.error('❌ Failed to register Slash Commands:', error);
    }
  }

  public async start() {
    console.log('🤖 DarkStar Bot is initializing...');

    const isLocalBot = process.env['IS_LOCAL_BOT'] === 'true';
    const isSameBotAsProd = process.env['PROD_DISCORD_CLIENT_ID'] && process.env['DISCORD_CLIENT_ID'] === process.env['PROD_DISCORD_CLIENT_ID'];
    const productionUrl = process.env['PRODUCTION_URL'];

    if (isLocalBot && isSameBotAsProd && productionUrl) {
      console.log(`📡 Local bot mode active. Requesting lease from production bot at ${productionUrl}...`);
      await this.sendLeasePing();
      
      // Start heartbeat
      setInterval(() => this.sendLeasePing(), 30000);
      
      // Delay connection to give production bot time to disconnect
      console.log('⏳ Waiting 3 seconds for production bot to disconnect...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    try {
      await this.client.login(process.env['DISCORD_TOKEN']);
      // Give it a second to fetch guilds before registering commands
      setTimeout(() => this.registerSlashCommands(), 2000);
    } catch (err) {
      console.error('Login Failed:', err);
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
        console.log('✅ Sent heartbeat to production bot. Lease renewed.');
      } else {
        console.warn(`⚠️ Failed to lease-pause production bot: ${response.statusText}`);
      }
    } catch (err) {
      console.error('❌ Error sending lease ping to production bot:', err);
    }
  }
}

const bot = new DarkStarBot();
bot.start();
