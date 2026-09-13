import { LoginDto, SignUpDto } from '@trading-stack/shared-dto';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { ResetPasswordDto } from '@trading-stack/shared-dto';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    identifier: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByUsername(identifier);
    if (!user) {
      // try email if not found by username. Wait, usersService doesn't have findByEmail, let's add it or just use a generic query if needed. But for now let's assume login is username.
      // Actually, we can just let usersService handle it. I'll change usersService in a bit if needed.
    }

    // For now, let's assume login uses username
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Omit<User, 'password'>) {
    const sessionToken = crypto.randomUUID();
    await this.usersService.createSession(user.id, sessionToken);

    const payload = { username: user.username, sub: user.id, sessionToken };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async logout(sessionToken: string) {
    await this.usersService.deactivateSession(sessionToken);
    return { success: true };
  }

  async signUp(userData: SignUpDto) {
    const user = await this.usersService.create(userData);
    return this.login(user);
  }

  async resetPassword(userId: string, dto: ResetPasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid old password');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.newPassword, salt);

    await this.usersService.updatePassword(userId, hashedPassword);

    return { success: true };
  }
}
