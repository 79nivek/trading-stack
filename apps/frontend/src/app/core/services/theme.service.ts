import { Injectable, signal, effect, inject, Injector } from '@angular/core';
import { StorageService } from './storage.service';
import { BackendApiService } from './api/backend-api.service';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private storage = inject(StorageService);
  private injector = inject(Injector);

  theme = signal<Theme>((this.storage.theme.get() as Theme) || 'auto');

  constructor() {
    // Listen for OS theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.theme() === 'auto') {
        this.applyTheme('auto');
      }
    });

    effect(() => {
      const currentTheme = this.theme();
      this.applyTheme(currentTheme);
      this.storage.theme.set(currentTheme);
    });
  }

  private applyTheme(themeType: Theme) {
    let isDark = false;
    if (themeType === 'auto') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = themeType === 'dark';
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  setTheme(newTheme: Theme, syncWithBackend = true) {
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
    let next: Theme = 'auto';
    if (current === 'light') next = 'dark';
    else if (current === 'dark') next = 'auto';
    else if (current === 'auto') next = 'light';

    this.setTheme(next);
  }
}
