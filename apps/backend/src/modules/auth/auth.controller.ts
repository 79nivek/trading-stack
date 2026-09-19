import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequireAuth } from '../../decorators/require-auth.decorator';
import {
  LoginDto,
  ResetPasswordDto,
  SignUpDto,
} from '@trading-stack/shared-dto';
import { BearerToken } from '../../decorators/bearer-token.decorator';
import { GetUser } from '../../decorators/user.decorator';
import { User } from '../users/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  async signUp(@Body() body: SignUpDto) {
    return this.authService.signUp(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(
      body.username,
      body.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('logout')
  @RequireAuth()
  async logout(@BearerToken() token: string) {
    return this.authService.logout(token);
  }

  @Post('reset-password')
  @RequireAuth()
  async resetPassword(@GetUser() user: User, @Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(user.id, body);
  }

  @Get('check')
  @RequireAuth()
  checkAuth() {
    return { ok: true };
  }
}
