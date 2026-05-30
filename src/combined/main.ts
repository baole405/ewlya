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

  // Start API and Discord Bot (via NestJS AppModule and DiscordBotService)
  await bootstrap();

  console.log('='.repeat(50));
  console.log('✅ API + Bot are both running!');
  console.log('='.repeat(50));
}

main().catch(console.error);
