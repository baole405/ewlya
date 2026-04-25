import { Client, GatewayIntentBits, Partials, Collection, REST, Routes } from 'discord.js';
import 'dotenv/config';

// Import Events
import * as interactionCreate from './events/interaction-create';
import * as messageReactionAdd from './events/message-reaction-add';
import * as messageCreate from './events/message-create';
import * as ready from './events/ready';

// Import Commands
import * as createMinesCheck from './commands/create-mines-check';
import * as editMinesCheck from './commands/edit-mines-check';

/**
 * DarkStar Discord Bot - Modular Initialization
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
      ],
      partials: [Partials.Message, Partials.Reaction, Partials.User],
    });

    this.initializeCommands();
    this.initializeEvents();
  }

  private initializeCommands() {
    this.commands.set(createMinesCheck.data.name, createMinesCheck);
    this.commands.set(editMinesCheck.data.name, editMinesCheck);
    (this.client as any).commands = this.commands;
  }

  private initializeEvents() {
    const events = [ready, messageReactionAdd, interactionCreate, messageCreate];
    
    for (const event of events) {
      const handler = async (...args: any[]) => {
        try {
          await (event as any).execute(...args);
        } catch (err) {
          console.error(`❌ Error in event ${event.name}:`, err);
        }
      };

      if ((event as any).once) {
        this.client.once(event.name, handler);
      } else {
        this.client.on(event.name, handler);
      }
    }
    console.log(`📂 Registered ${events.length} event handlers.`);
  }

  private async registerSlashCommands() {
    const token = process.env['DISCORD_TOKEN'];
    const clientId = process.env['DISCORD_CLIENT_ID'];

    if (!token || !clientId) return;

    const rest = new REST({ version: '10' }).setToken(token);
    const body = Array.from(this.commands.values()).map((c) => c.data.toJSON());

    try {
      const guilds = await this.client.guilds.fetch();
      console.log(`🚀 Registering Slash Commands for ${guilds.size} guilds...`);
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
    console.log('🤖 DarkStar Bot is initializing (Class Mode)...');
    console.log('🔑 Attempting Discord login...');
    try {
      await this.client.login(process.env['DISCORD_TOKEN']);
      await this.registerSlashCommands();
    } catch (err) {
      console.error('Login Failed:', err);
    }
  }
}

const bot = new DarkStarBot();
bot.start();
