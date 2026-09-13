import { Injectable, signal } from '@angular/core';
import { ButtonType } from '../../shared/components/button/button.component';

export interface PopupButton {
  text: string;
  type: ButtonType;
  action: () => void;
}

export interface PopupConfig {
  title: string;
  message: string;
  buttons: PopupButton[];
}

@Injectable({
  providedIn: 'root'
})
export class PopupService {
  currentPopup = signal<PopupConfig | null>(null);

  open(config: PopupConfig) {
    this.currentPopup.set(config);
  }

  close() {
    this.currentPopup.set(null);
  }
}
