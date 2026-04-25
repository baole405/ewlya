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
} from 'discord.js';
import { handleInteractionCreate } from './events/interaction-create.handler';
import { handleMessageReactionAdd } from './events/message-reaction-add.handler';
import { handleMessageCreate } from './events/message-create.handler';

@Injectable()
export class DiscordBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordBotService.name);
  private client: Client;

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
  }

  async onModuleInit() {
    const token = process.env['DISCORD_TOKEN'];
    if (!token) {
      this.logger.warn('⚠️ DISCORD_TOKEN not found — Bot will NOT start. API-only mode.');
      return;
    }

    this.registerEvents();

    try {
      await this.client.login(token);
      this.logger.log('🤖 Discord Bot logged in successfully!');
    } catch (err) {
      this.logger.error('❌ Discord Bot login failed:', err);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.destroy();
      this.logger.log('🔌 Discord Bot disconnected.');
    }
  }

  private registerEvents() {
    // Ready event
    this.client.once(Events.ClientReady, (readyClient) => {
      this.logger.log(`✅ Logged in as ${readyClient.user.tag}!`);
      this.logger.log(`📡 HOF Channel: ${process.env['HOF_CHANNEL_ID']}`);
      this.logger.log(`📡 Test Channel: ${process.env['TEST_CHANNEL_ID']}`);
      this.logger.log('🚀 Bot is fully operational and ready for use.');
    });

    // Interaction (select menus)
    this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
      try {
        await handleInteractionCreate(interaction);
      } catch (err) {
        this.logger.error('❌ Error in InteractionCreate:', err);
      }
    });

    // Reaction (✅ reaction triggers point flow)
    this.client.on(
      Events.MessageReactionAdd,
      async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
        try {
          await handleMessageReactionAdd(reaction, user);
        } catch (err) {
          this.logger.error('❌ Error in MessageReactionAdd:', err);
        }
      },
    );

    // Message (commands)
    this.client.on(Events.MessageCreate, async (message) => {
      try {
        await handleMessageCreate(message);
      } catch (err) {
        this.logger.error('❌ Error in MessageCreate:', err);
      }
    });
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

