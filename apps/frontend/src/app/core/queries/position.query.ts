import { inject, Signal } from '@angular/core';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { BaseResponse, useAuth } from '../services/api/backend-api.service';
import { lastValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Position } from '@trading-stack/shared-dto';
import { ENV } from '../../environments';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';
import { ToastService } from '../services/toast.service';
import { PopupService } from '../services/popup.service';

export function injectPositionQuery() {
  const http = inject(HttpClient);

  return injectQuery(() => {
    return {
      queryKey: ['positions'],
      queryFn: () => {
        return lastValueFrom(
          http
            .get<
              BaseResponse<Position[]>
            >(`${ENV.BACKEND_URL}/api/v1/binance/futures/positions`, { ...useAuth(true), ...skipSpinnerOptions() })
            .pipe(
              map((res) => res.result),
              map(
                (positions) =>
                  new Map(positions.map((pos) => [pos.symbol, pos])),
              ),
            ),
        );
      },
      retry: false,
      structuralSharing: false,
    };
  });
}

export function injectClosePositionMutation(
  symbol: Signal<string | undefined>,
) {
  const http = inject(HttpClient);
  const toastService = inject(ToastService);
  const popupService = inject(PopupService);

  return injectMutation(() => {
    const sym = symbol();
    return {
      mutationKey: ['position', sym],
      mutationFn: () =>
        lastValueFrom(
          http
            .delete<
              BaseResponse<any>
            >(`${ENV.BACKEND_URL}/api/v1/binance/futures/positions/${sym}`, { ...useAuth(true) })
            .pipe(map((res) => res.result)),
        ),
      onSuccess: () => {
        toastService.show('Position closed successfully!', 'success', 2000);
        popupService.close();
      },
      onError: (err: any) => {
        toastService.show(
          err.error?.message || 'Failed to close position',
          'danger',
        );
      },
    };
  });
}

export function injectPlaceFuturesPositionMutation() {
  const http = inject(HttpClient);
  return injectMutation(() => ({
    mutationKey: ['place-position'],
    mutationFn: (setup: any) =>
      lastValueFrom(
        http
          .post<
            BaseResponse<any>
          >(`${ENV.BACKEND_URL}/api/v1/binance/futures/positions`, setup, { ...useAuth(true) })
          .pipe(map((res) => res.result)),
      ),
  }));
}
