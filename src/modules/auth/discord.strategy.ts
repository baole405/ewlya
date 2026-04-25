import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-discord';
import { prisma } from '../../database/prisma';
import { Role } from '@prisma/client';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor() {
    const clientID = process.env['DISCORD_CLIENT_ID'];
    const clientSecret = process.env['DISCORD_CLIENT_SECRET'];
    const callbackURL = process.env['DISCORD_CALLBACK_URL'];

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error('Thiếu cấu hình Discord OAuth2 trong .env');
    }

    const options: StrategyOptions = {
      clientID,
      clientSecret,
      callbackURL,
      scope: ['identify', 'email'],
    };
    super(options);
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { id, username, avatar } = profile;
    const avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;

    // Check whitelist from .env
    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map((id) => id.trim());
    const isAdmin = adminIds.includes(id);

    // Find or create member/user in DB
    let member = await prisma.member.findUnique({
      where: { discordId: id },
    });

    if (!member) {
      member = await prisma.member.create({
        data: {
          discordId: id,
          nickname: username,
          ign: username,
          avatarUrl,
          role: isAdmin ? Role.ADMIN : Role.MEMBER,
        },
      });
    } else {
      // Sync info if already exists
      member = await prisma.member.update({
        where: { id: member.id },
        data: {
          avatarUrl,
          role: isAdmin ? Role.ADMIN : member.role,
        },
      });
    }

    return {
      userId: member.id,
      discordId: id,
      username: member.nickname,
      role: member.role,
    };
  }
}

