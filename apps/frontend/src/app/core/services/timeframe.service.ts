import { Injectable, signal, inject, Injector } from '@angular/core';

import { BackendApiService } from './api/backend-api.service';
import { TIME_FRAME, TIME_FRAMES } from '@trading-stack/shared-dto';

@Injectable({ providedIn: 'root' })
export class TimeframeService {
  private injector = inject(Injector);

  timeframe = signal<TIME_FRAME>(TIME_FRAME.ONE_H);

  get availableTimeframes(): TIME_FRAME[] {
    return TIME_FRAMES;
  }

  setTimeframe(tf: TIME_FRAME, saveToBackend = true) {
    if (TIME_FRAMES.includes(tf)) {
      this.timeframe.set(tf);
      if (saveToBackend) {
        const backendApi = this.injector.get(BackendApiService);
        backendApi.updateSettings({ timeFrame: tf }).subscribe();
      }
    }
  }
}
