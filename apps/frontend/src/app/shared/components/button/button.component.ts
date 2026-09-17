import { Component, Input, Output, EventEmitter } from '@angular/core';


export type ButtonType = 'primary' | 'danger' | 'warning' | 'success' | 'info';
export type ButtonSize = 'SM' | 'M' | 'L';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  @Input() btnType: ButtonType = 'primary';
  @Input() size: ButtonSize = 'M';
  @Input() disabled = false;
  @Input() isLoading = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  @Output() btnClick = new EventEmitter<Event>();

  onClick(event: Event) {
    if (!this.disabled && !this.isLoading) {
      this.btnClick.emit(event);
    }
  }

  get classes(): string {
    let base = 'btn ';

    // Size
    switch (this.size) {
      case 'SM': base += 'btn-sm '; break;
      case 'M': base += 'btn-md '; break;
      case 'L': base += 'btn-lg '; break;
    }

    // Type
    switch (this.btnType) {
      case 'primary': base += 'btn-primary '; break;
      case 'danger': base += 'btn-danger '; break;
      case 'warning': base += 'btn-warning '; break;
      case 'success': base += 'btn-success '; break;
      case 'info': base += 'btn-info '; break;
    }

    if (this.isLoading) {
      base += 'btn-loading ';
    }

    return base;
  }
}
