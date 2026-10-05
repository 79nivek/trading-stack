import { Injectable, signal, effect } from '@angular/core';
import { themeStorageInstance } from './storage.service';
import { injectSettingsMutation } from '../queries/user-setting.query';

export enum THEME {
  // eslint-disable-next-line no-unused-vars
  LIGHT = 'light',
  // eslint-disable-next-line no-unused-vars
  DARK = 'dark',
  // eslint-disable-next-line no-unused-vars
  AUTO = 'auto',
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  theme = signal<THEME>((themeStorageInstance.get() as THEME) || THEME.AUTO);

  userSettingMutation = injectSettingsMutation();

  constructor() {
    // Listen for OS theme changes
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.theme() === THEME.AUTO) {
          this.applyTheme(THEME.AUTO);
        }
      });

    effect(() => {
      const currentTheme = this.theme();
      this.applyTheme(currentTheme);
      themeStorageInstance.set(currentTheme);
    });
  }

  private applyTheme(themeType: THEME) {
    let isDark = false;
    if (themeType === THEME.AUTO) {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = themeType === THEME.DARK;
    }

    if (isDark) {
      document.documentElement.classList.add(THEME.DARK);
    } else {
      document.documentElement.classList.remove(THEME.DARK);
    }
  }

  setTheme(newTheme: THEME, syncWithBackend = true) {
    this.theme.set(newTheme);
    if (syncWithBackend) {
      this.userSettingMutation.mutateAsync({ theme: newTheme });
    }
  }

  toggleTheme() {
    const current = this.theme();
    let next: THEME = THEME.AUTO;
    if (current === THEME.LIGHT) next = THEME.DARK;
    else if (current === THEME.DARK) next = THEME.AUTO;
    else if (current === THEME.AUTO) next = THEME.LIGHT;

    this.setTheme(next);
  }
}
