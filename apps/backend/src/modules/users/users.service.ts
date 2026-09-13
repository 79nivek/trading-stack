import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { SessionRepository } from './session.repository';
import { User } from './user.entity';
import { Session } from './session.entity';
import * as bcrypt from 'bcryptjs';
import { UpdateUserDto } from '@trading-stack/shared-dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    if (!userData.email || !userData.username) {
       throw new ConflictException('Email and username are required');
    }
    const existingUser = await this.userRepository.findByEmailOrUsername(userData.email, userData.username);

    if (existingUser) {
      throw new ConflictException('User with that email or username already exists');
    }

    if (!userData.password) {
      throw new ConflictException('Password is required');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const newUser = this.userRepository.create();
    Object.assign(newUser, userData, { password: hashedPassword });

    return this.userRepository.save(newUser);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async updateConfig(userId: string, config: { language?: string; theme?: string }): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (config.language !== undefined) user.language = config.language;
    if (config.theme !== undefined) user.theme = config.theme;

    return this.userRepository.save(user);
  }

  async updateUser(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.username !== undefined && dto.username !== user.username) {
      const existing = await this.findByUsername(dto.username);
      if (existing) {
        throw new ConflictException('Username already taken');
      }
      user.username = dto.username;
    }

    return this.userRepository.save(user);
  }

  async updatePassword(userId: string, hashed: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    user.password = hashed;
    return this.userRepository.save(user);
  }

  async createSession(userId: string, token: string): Promise<Session> {
    const session = this.sessionRepository.create({ userId, token, isActive: true });
    return this.sessionRepository.save(session);
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    return this.sessionRepository.findByToken(token);
  }

  async deactivateSession(token: string): Promise<void> {
    await this.sessionRepository.deactivateToken(token);
  }
}
