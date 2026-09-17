import { Injectable } from '@nestjs/common';
import { UserSettingsRepository } from './user-settings.repository';
import { UserSettings } from './user-settings.entity';
import { UpdateSettingsDto } from '@trading-stack/shared-dto';

@Injectable()
export class UserSettingsService {
  constructor(private readonly userSettingsRepository: UserSettingsRepository) {}

  async getSettings(userId: string): Promise<UserSettings> {
    let settings = await this.userSettingsRepository.findByUserId(userId);
    if (!settings) {
      settings = this.userSettingsRepository.create({ userId });
      settings = await this.userSettingsRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<UserSettings> {
    const settings = await this.getSettings(userId);
    
    if (dto.theme !== undefined) settings.theme = dto.theme;
    if (dto.language !== undefined) settings.language = dto.language;
    if (dto.timeFrame !== undefined) settings.timeFrame = dto.timeFrame;

    return this.userSettingsRepository.save(settings);
  }
}
