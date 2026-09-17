import { Injectable, signal, inject, Injector } from '@angular/core';

import { BackendApiService } from './backend-api.service';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '6h' | '12h' | '24h' | '1d';
const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '6h', '12h', '1d'];

@Injectable({ providedIn: 'root' })
export class TimeframeService {
  private injector = inject(Injector);

  timeframe = signal<Timeframe>('1h');

  get availableTimeframes(): Timeframe[] {
    return TIMEFRAMES;
  }

  setTimeframe(tf: Timeframe, saveToBackend = true) {
    if (TIMEFRAMES.includes(tf)) {
      this.timeframe.set(tf);
      if (saveToBackend) {
        const backendApi = this.injector.get(BackendApiService);
        backendApi.updateSettings({ timeFrame: tf }).subscribe();
      }
    }
  }
}
