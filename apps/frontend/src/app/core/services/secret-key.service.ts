import { Injectable, signal } from '@angular/core';
import { ENV } from '../../environments';

@Injectable({
  providedIn: 'root',
})
export class SecretKeyService {
  /**
   * Holds the master token required to decrypt Binance credentials on the backend.
   * Saved to sessionStorage so it survives page reloads (F5) but is cleared when the tab closes.
   */
  private masterToken = signal<string | null>('');

  constructor() {
    if (ENV.DEVELOPMENT) {
      const token = localStorage.getItem('trading_master_token');
      if (token) {
        this.masterToken.set(token);
      }
    }
  }

  setToken(token: string) {
    if (ENV.DEVELOPMENT) {
      localStorage.setItem('trading_master_token', token);
    }
    this.masterToken.set(token);
  }

  clearToken() {
    localStorage.removeItem('trading_master_token');
    this.masterToken.set(null);
  }

  get hasToken(): boolean {
    return !!this.masterToken();
  }

  get token(): string {
    return this.masterToken() || '';
  }
}
