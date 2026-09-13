import { Injectable } from '@angular/core';

export class LocalStorageItem<T> {
  constructor(private key: string) {}

  get(): T | null {
    const item = localStorage.getItem(this.key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return item as unknown as T;
    }
  }

  set(value: T): void {
    const valToStore = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(this.key, valToStore);
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  readonly token = new LocalStorageItem<string>('auth_token');
  readonly theme = new LocalStorageItem<string>('theme');
  readonly lang = new LocalStorageItem<string>('lang');
}
