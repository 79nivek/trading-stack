import { Injectable, signal, effect, inject, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from './storage.service';
import { UserSettingService } from './user-setting.service';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private translate = inject(TranslateService);
  private storage = inject(StorageService);
  private injector = inject(Injector);

  language = signal<string>(this.storage.lang.get() || 'en');

  constructor() {
    this.translate.addLangs(['en', 'vi']);
    this.translate.setFallbackLang('en');

    effect(() => {
      const currentLang = this.language();
      this.translate.use(currentLang);
      this.storage.lang.set(currentLang);
    });
  }

  setLanguage(lang: string, syncWithBackend = true) {
    this.language.set(lang);
    if (syncWithBackend) {
      const userSettingService = this.injector.get(UserSettingService);
      userSettingService
        .updateSettings({ language: lang })
        .catch((err: any) => {
          console.error('Failed to sync language', err);
        });
    }
  }

  toggleLanguage() {
    this.setLanguage(this.language() === 'en' ? 'vi' : 'en');
  }
}
