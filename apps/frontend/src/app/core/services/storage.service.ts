import { ENV } from '../../environments';

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
    const valToStore =
      typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(this.key, valToStore);
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}
export class SessionStorageItem<T> {
  constructor(private key: string) {}

  get(): T | null {
    const item = sessionStorage.getItem(this.key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return item as unknown as T;
    }
  }

  set(value: T): void {
    const valToStore =
      typeof value === 'string' ? value : JSON.stringify(value);
    sessionStorage.setItem(this.key, valToStore);
  }

  clear(): void {
    sessionStorage.removeItem(this.key);
  }
}

export class InMemoryService {
  static cache = new Map<string, string>();

  constructor(private key: string) {}

  get(): string | null {
    return InMemoryService.cache.get(this.key) || null;
  }

  set(value: string): void {
    InMemoryService.cache.set(this.key, value);
  }

  clear(): void {
    InMemoryService.cache.delete(this.key);
  }
}

export const tokenStorageInstance = new LocalStorageItem<string>('auth_token');
export const masterTokenStorageInstance = ENV.DEVELOPMENT
  ? new LocalStorageItem<string>('master_token')
  : new InMemoryService('master_token');
export const themeStorageInstance = new LocalStorageItem<string>('theme');
export const langStorageInstance = new LocalStorageItem<string>('lang');
