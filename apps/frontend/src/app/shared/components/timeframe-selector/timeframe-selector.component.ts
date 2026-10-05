import { Component, computed } from '@angular/core';

import {
  DropdownComponent,
  DropdownItem,
} from '../dropdown/dropdown.component';
import { TIME_FRAME, TIME_FRAMES } from '@trading-stack/shared-dto';
import {
  injectSettingQuery,
  injectSettingsMutation,
} from '../../../core/queries/user-setting.query';

@Component({
  selector: 'app-timeframe-selector',
  standalone: true,
  imports: [DropdownComponent],
  templateUrl: './timeframe-selector.component.html',
  styleUrl: './timeframe-selector.component.scss',
})
export class TimeframeSelectorComponent {
  userSettingsMutation = injectSettingsMutation();
  userSettingQuery = injectSettingQuery();

  // Computed property to format DropdownItems
  dropdownItems = computed<DropdownItem[]>(() => {
    return TIME_FRAMES.map((tf) => ({
      label: tf, // translate pipe will fallback to the key itself
      action: tf,
    }));
  });

  onAction(action: string) {
    const tf = action as TIME_FRAME;
    if (TIME_FRAMES.includes(tf)) {
      this.userSettingsMutation.mutate({ timeFrame: tf });
    }
  }
}
