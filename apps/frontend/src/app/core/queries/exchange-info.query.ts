import { inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ENV } from '../../environments';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';
import { SymbolExchangeInfo, TradingFormatter } from '@trading-stack/shared';

export function injectExchangeInfoQuery() {
  const http = inject(HttpClient);

  return injectQuery(() => ({
    queryKey: ['exchange-info'],
    queryFn: () =>
      lastValueFrom(
        http
          .get<any>(
            `${ENV.BACKEND_URL}/api/v1/market-data/exchangeInfo`,
            skipSpinnerOptions(),
          )
          .pipe(
            map((res) => res.result),
            map(({ symbols }: { symbols: SymbolExchangeInfo[] }) => {
              return symbols.reduce((acc, symbol) => {
                acc.set(symbol.symbol, new TradingFormatter(symbol));
                return acc;
              }, new Map<string, TradingFormatter>());
            }),
          ),
      ),
    enabled: true,
    staleTime: Infinity,
  }));
}
