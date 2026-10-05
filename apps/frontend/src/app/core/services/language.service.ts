import { Injectable, signal, effect, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { langStorageInstance } from './storage.service';
import { injectSettingsMutation } from '../queries/user-setting.query';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private translate = inject(TranslateService);

  language = signal<string>(langStorageInstance.get() || 'en');

  userSettingMutation = injectSettingsMutation();

  constructor() {
    this.translate.addLangs(['en', 'vi']);
    this.translate.setFallbackLang('en');

    effect(() => {
      const currentLang = this.language();
      this.translate.use(currentLang);
      langStorageInstance.set(currentLang);
    });
  }

  setLanguage(lang: string, syncWithBackend = true) {
    this.language.set(lang);
    if (syncWithBackend) {
      this.userSettingMutation.mutateAsync({ language: lang });
    }
  }

  toggleLanguage() {
    this.setLanguage(this.language() === 'en' ? 'vi' : 'en');
  }
}
