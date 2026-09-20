import { Injectable, signal, effect, inject, Injector } from '@angular/core';
import { StorageService } from './storage.service';
import { BackendApiService } from './api/backend-api.service';

export enum THEME {
  // eslint-disable-next-line no-unused-vars
  LIGHT = 'light',
  // eslint-disable-next-line no-unused-vars
  DARK = 'dark',
  // eslint-disable-next-line no-unused-vars
  AUTO = 'auto'
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private storage = inject(StorageService);
  private injector = inject(Injector);

  theme = signal<THEME>((this.storage.theme.get() as THEME) ||  THEME.AUTO);

  constructor() {
    // Listen for OS theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.theme() === THEME.AUTO) {
        this.applyTheme(THEME.AUTO);
      }
    });

    effect(() => {
      const currentTheme = this.theme();
      this.applyTheme(currentTheme);
      this.storage.theme.set(currentTheme);
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
      const backendApi = this.injector.get(BackendApiService);
      backendApi.updateSettings({ theme: newTheme }).subscribe({
        error: (err) => console.error('Failed to sync theme', err)
      });
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
