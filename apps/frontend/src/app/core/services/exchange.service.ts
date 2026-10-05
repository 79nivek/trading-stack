import { Injectable } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';
import { TradingFormatter } from '@trading-stack/shared';
import { injectExchangeInfoQuery } from '../queries/exchange-info.query';

@Injectable({ providedIn: 'root' })
export class ExchangeInfoService {
  private exchangeInfoQuery = injectExchangeInfoQuery();
  private data$ = toObservable(this.exchangeInfoQuery.data);

  async getExchangeInfo(symbol: string): Promise<TradingFormatter> {
    const data = await firstValueFrom(
      this.data$.pipe(filter((d): d is Map<string, TradingFormatter> => !!d && d.size > 0))
    );
    const exchangeInfo = data.get(symbol);
    if (!exchangeInfo) {
      throw new Error(`Exchange info not found for symbol ${symbol}`);
    }
    return exchangeInfo;
  }

  async formatQuantity(quantity: number, symbol: string) {
    const exchangeInfo = await this.getExchangeInfo(symbol);
    return TradingFormatter.formatQuantity(quantity, exchangeInfo);
  }

  async formatPrice(price: number, symbol: string) {
    const exchangeInfo = await this.getExchangeInfo(symbol);
    return TradingFormatter.formatPrice(price, exchangeInfo);
  }
}
