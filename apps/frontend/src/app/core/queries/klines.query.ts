import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseResponse } from '../services/api/backend-api.service';
import { ENV } from '../../environments';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';
import { TIME_FRAME, KlineData } from '@trading-stack/shared-dto';
import { TradingFormatter } from '@trading-stack/shared';

export function getKlinesApi(
  http: HttpClient,
  symbol: string,
  query: {
    timeFrame: TIME_FRAME;
    limit?: number;
    endTime?: number;
  },
  options: TradingFormatter,
): Observable<KlineData[]> {
  if (query.limit === undefined) query.limit = 500;

  const params: any = {
    symbol: symbol.toUpperCase(),
    interval: query.timeFrame,
    limit: query.limit.toString(),
  };

  if (query.endTime) {
    params.endTime = query.endTime.toString();
  }

  return http
    .get<BaseResponse<any[][]>>(
      `${ENV.BACKEND_URL}/api/v1/market-data/klines/futures`,
      {
        params,
        ...skipSpinnerOptions(),
      },
    )
    .pipe(
      map((res: any) => res.result || res),
      map((data) => {
        return data.map((kline: any) => ({
          time: Math.floor(kline[0] / 1000), // convert ms to s for lightweight-charts
          open: TradingFormatter.formatPrice(kline[1], options),
          high: TradingFormatter.formatPrice(kline[2], options),
          low: TradingFormatter.formatPrice(kline[3], options),
          close: TradingFormatter.formatPrice(kline[4], options),
          volume: TradingFormatter.formatPrice(kline[5], options),
          normalizedToken: `${symbol.toLowerCase()}@kline_${query.timeFrame}`,
        }));
      }),
    );
}
