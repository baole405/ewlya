import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  userId: string;
  discordId: string;
  username: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(user: JwtPayload) {
    const payload = {
      sub: user.userId,
      discordId: user.discordId,
      username: user.username,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.userId,
        username: user.username,
        role: user.role,
      },
    };
  }
}
