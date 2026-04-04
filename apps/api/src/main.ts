/**
 * DarkStar API + Bot Server
 * Combined NestJS API and Discord Bot in a single process.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import 'dotenv/config';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:4200',           // Local Angular dev
      /\.pages\.dev$/,                    // Cloudflare Pages
    ],
  });

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
  Logger.log(`🚀 API is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
  Logger.log(`🤖 Discord Bot: ${process.env['DISCORD_TOKEN'] ? 'ENABLED' : 'DISABLED (no token)'}`);
}

bootstrap();

