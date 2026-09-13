import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {
  private activeRequests = 0;
  isVisible = signal<boolean>(false);

  show() {
    this.activeRequests++;
    this.updateVisibility();
  }

  hide() {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }
    this.updateVisibility();
  }

  private updateVisibility() {
    this.isVisible.set(this.activeRequests > 0);
  }
}
