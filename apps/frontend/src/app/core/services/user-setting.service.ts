import { Injectable, inject } from '@angular/core';
import { BackendApiService } from './api/backend-api.service';
import { UserSettingsResDto } from '@trading-stack/shared-dto';
import { lastValueFrom } from 'rxjs';
import { injectQuery } from '@tanstack/angular-query-experimental';

@Injectable({
  providedIn: 'root'
})
export class UserSettingService {
  private api = inject(BackendApiService);

  settingsQuery = injectQuery(() => ({
    queryKey: ['user-settings'],
    queryFn: () => lastValueFrom(this.api.getSettings()),
  }));

  get settings() {
    return this.settingsQuery.data; // this is a Signal
  }

  async updateSettings(newSettings: Partial<UserSettingsResDto>) {
    try {
      await lastValueFrom(this.api.updateSettings(newSettings));
      this.settingsQuery.refetch();
    } catch (e) {
      console.error('Failed to update settings', e);
      throw e;
    }
  }
}
