import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { skipSpinnerOptions } from '../../interceptors/spinner.interceptor';

@Injectable({
  providedIn: 'root',
})
export class BinanceFuturesApiService {
  private http = inject(HttpClient);

  // Base URL could be hardcoded or from environment. Using hardcoded proxy or direct call.
  // Note: Binance API may require CORS, usually fapi.binance.com allows CORS.
  private readonly BASE_URL = 'https://fapi.binance.com/fapi/v1';

  /** Cached USDT perpetual symbol list — fetched once per service lifetime */
  private symbolList$: Observable<string[]> | null = null;

  getExchangeInfo(): Observable<any> {
    return this.http.get<any>(
      `${this.BASE_URL}/exchangeInfo`,
      skipSpinnerOptions(),
    );
  }

  /**
   * Returns the list of all USDT-perpetual futures symbol names from Binance.
   * The result is cached for the lifetime of the service instance.
   */
  getFuturesSymbolList(): Observable<string[]> {
    if (!this.symbolList$) {
      this.symbolList$ = this.http
        .get<any>(`${this.BASE_URL}/exchangeInfo`, skipSpinnerOptions())
        .pipe(
          map((res) =>
            res.symbols
              .filter(
                (s: any) =>
                  s.symbol.endsWith('USDT') &&
                  s.contractType === 'PERPETUAL' &&
                  s.status === 'TRADING',
              )
              .map((s: any) => s.symbol as string),
          ),
          shareReplay(1),
        );
    }
    return this.symbolList$;
  }
}
