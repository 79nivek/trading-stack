import { inject, Injectable } from '@angular/core';
import { BinanceFuturesApiService } from './api/binance-futures-api.service';
import {
  SymbolExchangeInfo,
  TradingFormatter,
} from '../../shared/classes/trading-formater';

@Injectable({ providedIn: 'root' })
export class ExchangeInfoService {
  private binanceExchangeInfo: Map<string, TradingFormatter> = new Map();
  private binanceApi = inject(BinanceFuturesApiService);

  private _exchangeResolveWatchers: {
    symbol: string;
    resolve: (
      // eslint-disable-next-line no-unused-vars
      value: TradingFormatter | PromiseLike<TradingFormatter>,
    ) => void;
    // eslint-disable-next-line no-unused-vars
    reject: (reason?: any) => void;
  }[] = [];

  constructor() {
    this.binanceApi.getExchangeInfo().subscribe({
      next: ({ symbols }: { symbols: SymbolExchangeInfo[] }) => {
        symbols.forEach((symbol) => {
          this.binanceExchangeInfo.set(
            symbol.symbol,
            new TradingFormatter(symbol),
          );
        });

        this._resolveExchangeInfo();
      },
    });
  }

  private _resolveExchangeInfo() {
    if (this._exchangeResolveWatchers.length > 0) {
      for (const { symbol, resolve, reject } of this._exchangeResolveWatchers) {
        const exchangeInfo = this.binanceExchangeInfo.get(symbol);
        if (!exchangeInfo) {
          reject(new Error(`Exchange info not found for symbol ${symbol}`));
        } else {
          resolve(exchangeInfo);
        }
      }
      this._exchangeResolveWatchers.length = 0;
    }
  }

  getExchangeInfo(symbol: string): Promise<TradingFormatter> {
    return new Promise((resolve, reject) => {
      if (this.binanceExchangeInfo.size === 0) {
        this._exchangeResolveWatchers.push({ symbol, resolve, reject });
      } else {
        const exchangeInfo = this.binanceExchangeInfo.get(symbol);
        if (!exchangeInfo) {
          reject(new Error(`Exchange info not found for symbol ${symbol}`));
        } else {
          resolve(exchangeInfo);
        }
      }
    });
  }
}
