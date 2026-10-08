import { inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { BaseResponse, useAuth } from '../services/api/backend-api.service';
import { lastValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ENV } from '../../environments';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';
import { AccountInfoResponse } from '@trading-stack/shared-dto';

export function injectAccountQuery() {
  const http = inject(HttpClient);

  return injectQuery(() => {
    return {
      queryKey: ['account-info'],
      queryFn: () => {
        return lastValueFrom(
          http
            .get<
              BaseResponse<AccountInfoResponse>
            >(`${ENV.BACKEND_URL}/api/v1/binance/futures/account-info`, { ...useAuth(true), ...skipSpinnerOptions() })
            .pipe(map((res) => res.result)),
        );
      },
      retry: false,
      structuralSharing: false,
    };
  });
}
