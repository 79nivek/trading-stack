import { inject, Signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { BaseResponse, useAuth } from '../services/api/backend-api.service';
import { lastValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ForecastDto } from '@trading-stack/shared-dto';
import { ENV } from '../../environments';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';
import { injectSettingQuery } from './user-setting.query';

export function injectKlinesQuery(symbol: Signal<string | undefined>) {
  const http = inject(HttpClient);
  const userSettings = injectSettingQuery();

  return injectQuery(() => {
    const _symbol: string = symbol() as string;
    return {
      queryKey: ['forecasts', _symbol, userSettings.data()?.timeFrame],
      queryFn: () => {
        return lastValueFrom(
          http
            .get<BaseResponse<ForecastDto[]>>(
              `${ENV.BACKEND_URL}/api/v1/forecasts/futures`,
              {
                ...useAuth(true),
                ...skipSpinnerOptions(),
                params: {
                  symbol: _symbol,
                },
              },
            )
            .pipe(map((res) => res.result)),
        );
      },
      enabled: !!_symbol && !!userSettings.data()?.timeFrame,
      structuralSharing: false,
    };
  });
}
