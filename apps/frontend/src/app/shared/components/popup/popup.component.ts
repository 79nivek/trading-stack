import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupService } from '../../../core/services/popup.service';
import { ButtonComponent } from '../button/button.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [CommonModule, ButtonComponent, TranslatePipe],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.scss'
})
export class PopupComponent {
  popupService = inject(PopupService);

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      // Optional: close on backdrop click? Usually popups might be strict, so we don't auto-close.
    }
  }

  handleAction(action: () => void) {
    action();
    this.popupService.close();
  }
}
