/**
 * Combined Entry Point: API + Discord Bot
 * Runs both NestJS API and Discord Bot in a single process.
 * Used for production deployment on Render (free tier Web Service).
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import 'dotenv/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Bot imports
import { Client, GatewayIntentBits, Partials, Collection, REST, Routes } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import * as interactionCreate from '../bot/events/interaction-create';
import * as messageReactionAdd from '../bot/events/message-reaction-add';
import * as messageCreate from '../bot/events/message-create';
import * as ready from '../bot/events/ready';

// ==================== DISCORD BOT ====================
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
      partials: [Partials.Message, Partials.Reaction, Partials.User],
    });

    this.initializeCommands();
    this.initializeEvents();
  }

  private async initializeCommands() {
    const commandsPath = path.join(__dirname, '..', 'bot', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    console.log(`📂 Found ${commandFiles.length} command files.`);

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = await import(filePath);

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
    this.client.on('ready', (c) => (ready as any).execute(c));
    this.client.on('interactionCreate', (i) => (interactionCreate as any).execute(i));
    this.client.on('messageCreate', (m) => (messageCreate as any).execute(m));
    this.client.on('messageReactionAdd', (r, u) => (messageReactionAdd as any).execute(r, u));

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
    try {
      await this.client.login(process.env['DISCORD_TOKEN']);
      setTimeout(() => this.registerSlashCommands(), 2000);
    } catch (err) {
      console.error('Bot Login Failed:', err);
    }
  }
}

// ==================== NESTJS API ====================
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Enable CORS for frontend
  app.enableCors({
    origin: '*', // Allow all for dev
  });

  // Root Landing Page (OK + Button)
  const server = app.getHttpAdapter();
  server.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DarkStar API</title>
        <style>
          body { 
            background: #0f172a; color: white; font-family: 'Inter', sans-serif; 
            display: flex; flex-direction: column; align-items: center; justify-content: center; 
            height: 100vh; margin: 0; 
          }
          .card { 
            background: #1e293b; padding: 2rem; border-radius: 1rem; 
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); text-align: center;
          }
          h1 { color: #38bdf8; margin-bottom: 0.5rem; }
          p { color: #94a3b8; margin-bottom: 2rem; }
          .btn {
            background: #38bdf8; color: #0f172a; padding: 0.75rem 1.5rem; 
            border-radius: 0.5rem; text-decoration: none; font-weight: bold;
            transition: transform 0.2s; display: inline-block;
          }
          .btn:hover { transform: scale(1.05); background: #7dd3fc; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Status: OK</h1>
          <p>The DarkStar API & Bot are running smoothly.</p>
          <a href="/api/docs" class="btn">🚀 Open API Documentation</a>
        </div>
      </body>
      </html>
    `);
  });

  // Health check endpoint for UptimeRobot
  server.get('/health', (req, res) => {
    res.send({ status: 'ok', uptime: process.uptime() });
  });

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('DarkStar Clan API')
    .setDescription('The internal API interface for DarkStar frontend & bot')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  const port = process.env['PORT'] || 3000;
  await app.listen(port);

  console.log('--------------------------------------------------');
  Logger.log(`🚀 API is running on port ${port}`);
  Logger.log(`📚 Swagger Docs: /api/docs`);
  Logger.log(`💚 Health Check: /health`);
  console.log('--------------------------------------------------');
}

// ==================== START EVERYTHING ====================
async function main() {
  console.log('='.repeat(50));
  console.log('🌟 DarkStar Combined Server Starting...');
  console.log('='.repeat(50));

  // Start API first (provides the HTTP server that Render needs)
  await bootstrap();

  // Then start the Discord Bot
  const bot = new DarkStarBot();
  await bot.start();

  console.log('='.repeat(50));
  console.log('✅ API + Bot are both running!');
  console.log('='.repeat(50));
}

main().catch(console.error);
