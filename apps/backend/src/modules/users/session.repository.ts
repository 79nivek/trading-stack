import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Session } from './session.entity';

@Injectable()
export class SessionRepository extends Repository<Session> {
  constructor(private dataSource: DataSource) {
    super(Session, dataSource.createEntityManager());
  }

  async findByToken(token: string): Promise<Session | null> {
    return this.findOne({ where: { token } });
  }

  async deactivateToken(token: string): Promise<void> {
    await this.update({ token }, { isActive: false });
  }
}
