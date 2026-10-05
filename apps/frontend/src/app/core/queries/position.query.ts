import { inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { BaseResponse, useAuth } from '../services/api/backend-api.service';
import { lastValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Position } from '@trading-stack/shared-dto';
import { ENV } from '../../environments';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';

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
            .pipe(map((res) => res.result)),
        );
      },
      retry: false,
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
