import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  toastService = inject(ToastService);

  getIcon(level: string): string {
    switch (level) {
      case 'success': return '✓';
      case 'danger': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  }

  getBgClass(level: string): string {
    switch (level) {
      case 'success': return 'bg-green-500 text-white';
      case 'danger': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  }
}
