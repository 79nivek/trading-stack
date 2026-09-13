import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../core/services/modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  @Input() size: 'SM' | 'M' | 'L' = 'M';
  @Input() hideCloseButton = false;

  modalService = inject(ModalService);

  get sizeClass(): string {
    switch(this.size) {
      case 'SM': return 'max-w-md';
      case 'L': return 'max-w-4xl';
      case 'M':
      default: return 'max-w-2xl';
    }
  }

  close() {
    this.modalService.close();
  }
}
