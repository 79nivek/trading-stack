import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LoginSession } from './login-session.entity';

@Injectable()
export class LoginSessionRepository extends Repository<LoginSession> {
  constructor(dataSource: DataSource) {
    super(LoginSession, dataSource.createEntityManager());
  }

  async findByToken(token: string): Promise<LoginSession | null> {
    return this.findOne({ where: { token } });
  }

  async deactivateToken(token: string): Promise<void> {
    await this.update({ token }, { isActive: false });
  }
}
