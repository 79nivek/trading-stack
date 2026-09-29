import { DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  signal,
  ViewChild,
} from '@angular/core';

import { LineStyle } from 'lightweight-charts';

export type LineCheckPoint = {
  color: string;
  title: string;
  value: string;
  lineStyle: LineStyle;
};

@Component({
  selector: 'app-chart-menu',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './chart-menu.component.html',
  styleUrl: './chart-menu.component.scss',
})
export class ChartMenuComponent {
  @Input() symbol = '';
  @Input() selectedPrice: number | null = null;

  @Output() closePopup = new EventEmitter<void>();

  @ViewChild('pricePopup') pricePopup?: ElementRef;

  @HostListener('document:mousedown', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  onClickOutside(event: Event) {
    if (this.showMenu()) {
      // If the click is inside the popup itself, do nothing
      if (this.pricePopup?.nativeElement?.contains(event.target)) {
        return;
      }
      this.showMenu.set(false);
    }
  }

  showMenu = signal(false);
}
