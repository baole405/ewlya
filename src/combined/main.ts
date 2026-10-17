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
import { DiscordBotService } from '../bot/discord-bot.service';

// In-memory log buffer to allow checking recent logs via HTTP
interface LogEntry {
  time: string;
  level: string;
  msg: string;
}
const logBuffer: LogEntry[] = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function pushLog(level: string, ...args: any[]) {
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logBuffer.push({ time: new Date().toISOString(), level, msg });
  if (logBuffer.length > 100) logBuffer.shift();
}

console.log = (...args: any[]) => {
  pushLog('INFO', ...args);
  originalLog.apply(console, args);
};
console.error = (...args: any[]) => {
  pushLog('ERROR', ...args);
  originalError.apply(console, args);
};
console.warn = (...args: any[]) => {
  pushLog('WARN', ...args);
  originalWarn.apply(console, args);
};

// ==================== NESTJS API ====================
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Enable CORS for frontend
  app.enableCors({
    origin: '*',
  });

  const botService = app.get(DiscordBotService, { strict: false });

  // Root Landing Page (Live Status + Direct Links)
  const server = app.getHttpAdapter();
  server.get('/', (req: any, res: any) => {
    const botStatus = botService ? botService.getStatus() : null;
    const isBotOnline = botStatus && botStatus.connected;
    const botBadgeColor = isBotOnline ? '#22c55e' : '#ef4444';
    const botText = isBotOnline
      ? `🟢 Bot Online (${botStatus.tag || 'Liza'}) — Ping: ${botStatus.pingMs ?? 0}ms`
      : '🔴 Bot Disconnected';
    const guildText = isBotOnline && botStatus.guilds.length > 0
      ? botStatus.guilds.map((g: any) => `${g.name} (${g.memberCount} members)`).join(', ')
      : 'None';

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DarkStar Hub — API & Bot Status</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            background: #0b0f19; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            display: flex; flex-direction: column; align-items: center; justify-content: center; 
            min-height: 100vh; margin: 0; padding: 1rem; box-sizing: border-box;
          }
          .card { 
            background: #151d2f; border: 1px solid #1e293b; padding: 2.5rem; border-radius: 1.25rem; 
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4); text-align: center; max-width: 520px; width: 100%;
          }
          h1 { color: #38bdf8; margin: 0 0 0.5rem 0; font-size: 1.75rem; }
          .subtitle { color: #94a3b8; margin-bottom: 1.75rem; font-size: 0.95rem; }
          .status-box {
            background: #0f172a; border: 1px solid #334155; border-radius: 0.75rem; padding: 1rem;
            margin-bottom: 1.5rem; text-align: left; font-size: 0.9rem;
          }
          .status-item { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
          .status-item:last-child { margin-bottom: 0; }
          .status-label { color: #64748b; }
          .status-val { font-weight: 600; }
          .btn-group { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
          .btn {
            background: #38bdf8; color: #0b0f19; padding: 0.7rem 1.2rem; 
            border-radius: 0.5rem; text-decoration: none; font-weight: 600; font-size: 0.9rem;
            transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.4rem;
          }
          .btn:hover { background: #7dd3fc; transform: translateY(-2px); }
          .btn-secondary { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
          .btn-secondary:hover { background: #334155; color: #fff; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>DarkStar Production Hub</h1>
          <p class="subtitle">Unified 24/7 REST API & Discord Bot Engine</p>
          <div class="status-box">
            <div class="status-item">
              <span class="status-label">API Status:</span>
              <span class="status-val" style="color: #22c55e;">🟢 Online (Uptime: ${Math.floor(process.uptime())}s)</span>
            </div>
            <div class="status-item">
              <span class="status-label">Discord Bot:</span>
              <span class="status-val" style="color: ${botBadgeColor};">${botText}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Guilds:</span>
              <span class="status-val" style="color: #93c5fd;">${guildText}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Commands Loaded:</span>
              <span class="status-val" style="color: #facc15;">${botStatus ? botStatus.commandsLoaded : 0} registered</span>
            </div>
          </div>
          <div class="btn-group">
            <a href="/health" class="btn">💚 Live Health JSON</a>
            <a href="/logs" class="btn btn-secondary">📋 Live Logs</a>
            <a href="/api/docs" class="btn btn-secondary">📚 Swagger API Docs</a>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Health check endpoint with Bot Diagnostics
  server.get('/health', (req: any, res: any) => {
    const botStatus = botService ? botService.getStatus() : null;
    res.send({
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      bot: botStatus || { connected: false, message: 'Bot service not initialized' },
    });
  });

  // Live in-memory logs endpoint
  server.get('/logs', (req: any, res: any) => {
    if (req.query.format === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      const text = logBuffer
        .map(entry => `[${entry.time}] [${entry.level}] ${entry.msg}`)
        .join('\n');
      return res.send(text || 'No logs recorded yet.');
    }
    res.send({
      count: logBuffer.length,
      logs: logBuffer.slice().reverse(),
    });
  });

  // Alias
  server.get('/health/logs', (req: any, res: any) => {
    res.redirect('/logs');
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
  Logger.log(`📋 Live Logs: /logs`);
  console.log('--------------------------------------------------');
}

// ==================== START EVERYTHING ====================
async function main() {
  console.log('='.repeat(50));
  console.log('🌟 DarkStar Combined Server Starting...');
  console.log('='.repeat(50));

  await bootstrap();

  console.log('='.repeat(50));
  console.log('✅ API + Bot are both running!');
  console.log('='.repeat(50));
}

main().catch(console.error);
