import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SecretKeyService {
  /**
   * Holds the master token required to decrypt Binance credentials on the backend.
   * This is explicitly NOT saved to localStorage for extreme security.
   * Disappears immediately upon tab close/reload.
   */
  readonly masterToken = signal<string | null>(null);

  setToken(token: string) {
    this.masterToken.set(token);
  }

  clearToken() {
    this.masterToken.set(null);
  }
}
