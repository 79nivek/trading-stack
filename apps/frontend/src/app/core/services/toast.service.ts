import { Injectable, signal } from '@angular/core';

export type ToastLevel = 'info' | 'success' | 'warning' | 'danger';

export interface Toast {
  id: number;
  message: string;
  level: ToastLevel;
  timeout?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private idCounter = 0;

  show(message: string, level: ToastLevel = 'info', timeout?: number) {
    const id = ++this.idCounter;
    const toast: Toast = { id, message, level, timeout };
    
    this.toasts.update(current => [...current, toast]);

    if (timeout) {
      setTimeout(() => this.remove(id), timeout);
    }
  }

  remove(id: number) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
