import { inject, Signal } from '@angular/core';
import {
  injectMutation,
  injectQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { BaseResponse, useAuth } from '../services/api/backend-api.service';
import { lastValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import {
  CreateMarkedPriceDto,
  MarkedPriceResDto,
} from '@trading-stack/shared-dto';
import { ENV } from '../../environments';
import { ToastService } from '../services/toast.service';

export function injectMarkedPriceQuery(symbol: Signal<string | undefined>) {
  const http = inject(HttpClient);
  return injectQuery(() => {
    const _symbol = symbol();

    return {
      queryKey: ['marked-prices', _symbol],
      queryFn: () => {
        return lastValueFrom(
          http
            .get<
              BaseResponse<MarkedPriceResDto[]>
            >(`${ENV.BACKEND_URL}/api/v1/marked-prices/${_symbol}`, { ...useAuth(true) })
            .pipe(map((res) => res.result)),
        );
      },
      enabled: !!_symbol,
      structuralSharing: false,
    };
  });
}

export function injectMarkedPriceMutation(symbol: Signal<string | undefined>) {
  const http = inject(HttpClient);
  const toastService = inject(ToastService);
  const queryClient = inject(QueryClient);

  const sym = symbol();

  return injectMutation(() => ({
    mutationKey: ['marked-prices', sym],
    mutationFn: (body: CreateMarkedPriceDto) =>
      lastValueFrom(
        http
          .post<
            BaseResponse<MarkedPriceResDto>
          >(`${ENV.BACKEND_URL}/api/v1/marked-prices`, body, { ...useAuth(true) })
          .pipe(map((res) => res.result)),
      ),
    onSuccess: () => {
      toastService.show(`Add Marked Price successfully`, 'success', 5000);
      queryClient.invalidateQueries({
        queryKey: ['marked-prices', sym],
      });
    },
    onError: (error) => {
      toastService.show(
        error.message || 'Failed to add Marked Price',
        'danger',
      );
    },
  }));
}
