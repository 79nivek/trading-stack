import { inject, Signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { BaseResponse, useAuth } from '../services/api/backend-api.service';
import { lastValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ForecastDto } from '@trading-stack/shared-dto';
import { ENV } from '../../environments';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';
import { injectSettingQuery } from './user-setting.query';

export function injectForecastQuery(symbol: Signal<string | undefined>) {
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
      retry: false,
      enabled: !!_symbol && !!userSettings.data()?.timeFrame,
      structuralSharing: false,
    };
  });
}

// export function injectMarkedPriceMutation(symbol: Signal<string | undefined>) {
//   const http = inject(HttpClient);
//   const backendServ = inject(BackendApiService);
//   const toastService = inject(ToastService);
//   const queryClient = inject(QueryClient);

//   const sym = symbol();

//   return injectMutation(() => ({
//     mutationKey: ['marked-prices', sym],
//     mutationFn: (body: CreateMarkedPriceDto) =>
//       lastValueFrom(
//         http
//           .post<
//             BaseResponse<MarkedPriceResDto>
//           >(`${ENV.BACKEND_URL}/api/v1/marked-prices`, body, { ...backendServ.useAuth(true) })
//           .pipe(map((res) => res.result)),
//       ),
//     onSuccess: () => {
//       toastService.show(`Add Marked Price successfully`, 'success', 5000);
//       queryClient.invalidateQueries({
//         queryKey: ['marked-prices', sym],
//       });
//     },
//     onError: (error) => {
//       toastService.show(
//         error.message || 'Failed to add Marked Price',
//         'danger',
//       );
//     },
//   }));
// }
