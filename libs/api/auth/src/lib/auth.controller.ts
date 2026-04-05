import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('discord')
  @UseGuards(AuthGuard('discord'))
  @ApiOperation({ summary: 'Bắt đầu đăng nhập bằng Discord' })
  async discordAuth() {
    // Passport redirects to Discord
  }

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  @ApiOperation({ summary: 'Callback từ Discord sau khi login' })
  async discordAuthCallback(@Req() req: { user: any }, @Res() res: { redirect: (url: string) => void }) {
    const { access_token, user } = await this.authService.login(req.user);
    
    // Redirect về frontend kèm token
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:4200';
    return res.redirect(`${frontendUrl}/auth/callback?token=${access_token}&user=${JSON.stringify(user)}`);
  }
}
