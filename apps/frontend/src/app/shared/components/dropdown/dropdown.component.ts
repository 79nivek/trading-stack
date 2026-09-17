import { Component, Input, Output, EventEmitter, ElementRef, HostListener, signal } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

export interface DropdownItem {
  label: string; // Translation key
  action: string;
  icon?: string;
  divider?: boolean;
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.scss'
})
export class DropdownComponent {
  @Input() items: DropdownItem[] = [];
  @Output() action = new EventEmitter<string>();

  isOpen = signal<boolean>(false);

  constructor(private eRef: ElementRef) {}

  toggle() {
    this.isOpen.update(v => !v);
  }

  onItemClick(item: DropdownItem) {
    if (item.divider) return;
    this.action.emit(item.action);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
