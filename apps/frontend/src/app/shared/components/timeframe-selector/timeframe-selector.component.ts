import { Component, inject, computed } from '@angular/core';

import { TimeframeService } from '../../../core/services/timeframe.service';
import {
  DropdownComponent,
  DropdownItem,
} from '../dropdown/dropdown.component';
import { TIME_FRAME } from '@trading-stack/shared-dto';

@Component({
  selector: 'app-timeframe-selector',
  standalone: true,
  imports: [DropdownComponent],
  templateUrl: './timeframe-selector.component.html',
  styleUrl: './timeframe-selector.component.scss',
})
export class TimeframeSelectorComponent {
  timeframeService = inject(TimeframeService);

  // Computed property to format DropdownItems
  dropdownItems = computed<DropdownItem[]>(() => {
    return this.timeframeService.availableTimeframes.map((tf) => ({
      label: tf, // translate pipe will fallback to the key itself
      action: tf,
    }));
  });

  onAction(action: string) {
    this.timeframeService.setTimeframe(action as TIME_FRAME);
  }
}
