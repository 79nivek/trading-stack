import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { KlineData } from '@trading-stack/shared-dto';

import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';

@Injectable({
  providedIn: 'root'
})
export class BinanceFuturesApiService {
  private http = inject(HttpClient);

  // Base URL could be hardcoded or from environment. Using hardcoded proxy or direct call.
  // Note: Binance API may require CORS, usually fapi.binance.com allows CORS.
  private readonly BASE_URL = 'https://fapi.binance.com/fapi/v1';

  getKlines(symbol: string, interval: string, limit = 500, endTime?: number): Observable<KlineData[]> {
    const params: any = {
      symbol: symbol.toUpperCase(),
      interval,
      limit: limit.toString()
    };

    if (endTime) {
      params.endTime = endTime.toString();
    }

    return this.http.get<any[][]>(`${this.BASE_URL}/klines`, {
      params,
      ...skipSpinnerOptions()
    }).pipe(
      map(data => {
        return data.map(kline => ({
          time: Math.floor(kline[0] / 1000), // convert ms to s for lightweight-charts
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5]),
          normalizedToken: `${symbol.toLowerCase()}@kline_${interval}`
        }));
      })
    );
  }

  getExchangeInfo(symbol: string): Observable<{ tickSize: string, pricePrecision: number }> {
    return this.http.get<any>(`${this.BASE_URL}/exchangeInfo`, skipSpinnerOptions()).pipe(
      map(res => {
        const symbolInfo = res.symbols.find((s: any) => s.symbol === symbol.toUpperCase());
        if (!symbolInfo) {
          throw new Error(`Symbol ${symbol} not found in exchangeInfo`);
        }

        const priceFilter = symbolInfo.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
        return {
          tickSize: priceFilter ? priceFilter.tickSize : '0.01',
          pricePrecision: symbolInfo.pricePrecision || 2
        };
      })
    );
  }
}
