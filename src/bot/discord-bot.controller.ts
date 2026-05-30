import { Controller, Post, Headers, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { DiscordBotService } from './discord-bot.service';

@Controller('bot')
export class DiscordBotController {
  constructor(private readonly discordBotService: DiscordBotService) {}

  @Post('lease-pause')
  @HttpCode(HttpStatus.OK)
  leasePause(@Headers('x-bot-token') botToken: string) {
    const token = process.env['DISCORD_TOKEN'];
    if (!token || botToken !== token) {
      throw new UnauthorizedException('Invalid bot token');
    }

    this.discordBotService.registerLease();
    return { status: 'success', message: 'Lease registered, production bot paused' };
  }
}
