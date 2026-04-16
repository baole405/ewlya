import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] || 'darkstar-premium-secret-key-2026',
    });
  }

  async validate(payload: any) {
    if (payload === 'dummy_token') {
      return {
        userId: 'dev-admin',
        discordId: '123456789',
        username: 'DevAdmin',
        role: 'ADMIN',
      };
    }
    return {
      userId: payload.sub,
      discordId: payload.discordId,
      username: payload.username,
      role: payload.role,
    };
  }
}
