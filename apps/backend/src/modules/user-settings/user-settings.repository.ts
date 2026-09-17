import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserSettings } from './user-settings.entity';

@Injectable()
export class UserSettingsRepository extends Repository<UserSettings> {
  constructor(dataSource: DataSource) {
    super(UserSettings, dataSource.createEntityManager());
  }

  async findByUserId(userId: string): Promise<UserSettings | null> {
    return this.findOne({ where: { userId } });
  }
}
