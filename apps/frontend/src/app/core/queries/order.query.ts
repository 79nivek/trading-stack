import { inject } from '@angular/core';
import {
  injectQuery,
  injectMutation,
} from '@tanstack/angular-query-experimental';
import { BaseResponse, useAuth } from '../services/api/backend-api.service';
import { lastValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AlgoOrder, Order, SetOrderReq } from '@trading-stack/shared-dto';
import { ENV } from '../../environments';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';
import { ToastService } from '../services/toast.service';

export function injectOrderQuery() {
  const http = inject(HttpClient);

  return injectQuery(() => {
    return {
      queryKey: ['order', ''],
      queryFn: () => {
        return lastValueFrom(
          http
            .get<
              BaseResponse<Order[]>
            >(`${ENV.BACKEND_URL}/api/v1/binance/futures/orders`, { ...useAuth(true), ...skipSpinnerOptions() })
            .pipe(
              map((res) => res.result),
              map((orders) => {
                const orderMap = new Map<string, Order[]>();
                for (const order of orders) {
                  if (!order.symbol) continue;
                  if (!orderMap.has(order.symbol))
                    orderMap.set(order.symbol, []);
                  orderMap.get(order.symbol)?.push(order);
                }
                return orderMap;
              }),
            ),
        );
      },
      retry: false,
      structuralSharing: false,
    };
  });
}

export function injectAlgoOrderQuery() {
  const http = inject(HttpClient);

  return injectQuery(() => {
    return {
      queryKey: ['algo-order', ''],
      queryFn: () => {
        return lastValueFrom(
          http
            .get<
              BaseResponse<AlgoOrder[]>
            >(`${ENV.BACKEND_URL}/api/v1/binance/futures/algo-orders`, { ...useAuth(true), ...skipSpinnerOptions() })
            .pipe(
              map((res) => res.result),
              map((algoOrders) => {
                const algoOrderMap = new Map<string, AlgoOrder[]>();
                for (const order of algoOrders) {
                  if (!order.symbol) continue;
                  if (!algoOrderMap.has(order.symbol))
                    algoOrderMap.set(order.symbol, []);
                  algoOrderMap.get(order.symbol)?.push(order);
                }
                return algoOrderMap;
              }),
            ),
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

export function injectSetAlgoTPMutation() {
  const http = inject(HttpClient);
  return injectMutation(() => ({
    mutationKey: ['set-take-profit'],
    retry: 2,
    mutationFn: (params: SetOrderReq) =>
      lastValueFrom(
        http
          .post<
            BaseResponse<any>
          >(`${ENV.BACKEND_URL}/api/v1/binance/futures/orders/take-profit`, params, { ...useAuth(true), ...skipSpinnerOptions() })
          .pipe(map((res) => res.result)),
      ),
  }));
}

export function injectSetAlgoSLMutation() {
  const http = inject(HttpClient);
  const toastService = inject(ToastService);
  return injectMutation(() => ({
    mutationKey: ['set-stop-loss'],
    retry: 2,
    mutationFn: (params: SetOrderReq) =>
      lastValueFrom(
        http
          .post<
            BaseResponse<any>
          >(`${ENV.BACKEND_URL}/api/v1/binance/futures/orders/stop-loss`, params, { ...useAuth(true), ...skipSpinnerOptions() })
          .pipe(map((res) => res.result)),
      ),
    onSuccess: () => {
      toastService.show(`Set Take Profit successfully`, 'success', 5000);
    },
    onError: (error) => {
      toastService.show(`Set Take Profit failed`, 'danger');
    },
  }));
}
