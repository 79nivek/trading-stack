import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { KlineData } from '@trading-stack/shared-dto';

import { skipSpinnerOptions } from '../../interceptors/spinner.interceptor';
import { TradingFormatter } from '../../../shared/classes/trading-formater';

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

  getKlines(
    symbol: string,
    query: {
      interval: string;
      limit?: number;
      endTime?: number;
    },
    formatOptions: {
      tickSize: string | number;
      pricePrecision: number;
    } = {
      tickSize: '1',
      pricePrecision: 0,
    },
  ): Observable<KlineData[]> {

    if (query.limit === undefined) query.limit = 500;

    const params: any = {
      symbol: symbol.toUpperCase(),
      interval: query.interval,
      limit: query.limit.toString(),
    };

    if (query.endTime) {
      params.endTime = query.endTime.toString();
    }

    return this.http
      .get<any[][]>(`${this.BASE_URL}/klines`, {
        params,
        ...skipSpinnerOptions(),
      })
      .pipe(
        map((data) => {
          return data.map((kline) => ({
            time: Math.floor(kline[0] / 1000), // convert ms to s for lightweight-charts
            open: TradingFormatter.formatPrice(kline[1], formatOptions),
            high: TradingFormatter.formatPrice(kline[2], formatOptions),
            low: TradingFormatter.formatPrice(kline[3], formatOptions),
            close: TradingFormatter.formatPrice(kline[4], formatOptions),
            volume: TradingFormatter.formatPrice(kline[5], formatOptions),
            normalizedToken: `${symbol.toLowerCase()}@kline_${query.interval}`,
          }));
        }),
      );
  }

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
