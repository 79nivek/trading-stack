import { inject } from '@angular/core';
import {
  injectMutation,
  injectQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { BaseResponse, useAuth } from '../services/api/backend-api.service';
import { lastValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import {
  CreateFollowedSymbolDto,
  FollowedSymbolDto,
  ReorderFollowedSymbolsDto,
} from '@trading-stack/shared-dto';
import { ENV } from '../../environments';
import { ToastService } from '../services/toast.service';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';

export function injectFollowedQuery() {
  const http = inject(HttpClient);

  return injectQuery(() => {
    return {
      queryKey: ['followed-symbols'],
      queryFn: () => {
        return lastValueFrom(
          http
            .get<
              BaseResponse<FollowedSymbolDto[]>
            >(`${ENV.BACKEND_URL}/api/v1/followed-symbols`, { ...useAuth() })
            .pipe(map((res) => res.result)),
        );
      },
      retry: false,
      structuralSharing: false,
    };
  });
}

export function injectFollowedDataQuery() {
  const http = inject(HttpClient);

  return injectQuery(() => {
    return {
      queryKey: ['followed'],
      queryFn: () => {
        return lastValueFrom(
          http
            .get<
              BaseResponse<FollowedSymbolDto[]>
            >(`${ENV.BACKEND_URL}/api/v1/followed-symbols`, { ...useAuth() })
            .pipe(map((res) => res.result)),
        );
      },
      retry: false,
      structuralSharing: false,
    };
  });
}

export function injectRemoveFollowedMutation() {
  const http = inject(HttpClient);
  const toastService = inject(ToastService);
  const queryClient = inject(QueryClient);

  return injectMutation(() => {
    return {
      mutationKey: ['followed-symbols'],
      mutationFn: (id: string) =>
        lastValueFrom(
          http
            .delete<
              BaseResponse<void>
            >(`${ENV.BACKEND_URL}/api/v1/followed-symbols/${id}`, { ...useAuth() })
            .pipe(map((res) => res.result)),
        ),
      onSuccess: () => {
        toastService.show(`Removed`, 'success', 5000);
        queryClient.invalidateQueries({
          queryKey: ['followed-symbols'],
        });
      },
      onError: (error: any) => {
        toastService.show(
          error?.error?.message || 'Failed to remove symbol.',
          'danger',
        );
      },
    };
  });
}

export function injectReorderFollowedMutation() {
  const http = inject(HttpClient);
  const toastService = inject(ToastService);
  const queryClient = inject(QueryClient);

  return injectMutation(() => {
    return {
      mutationKey: ['followed-symbols'],
      mutationFn: (dto: ReorderFollowedSymbolsDto) =>
        lastValueFrom(
          http
            .patch<
              BaseResponse<void>
            >(`${ENV.BACKEND_URL}/api/v1/followed-symbols/reorder`, dto, { ...useAuth(), ...skipSpinnerOptions() })
            .pipe(map((res) => res.result)),
        ),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['followed-symbols'],
        });
      },
      onError: () => {
        toastService.show('Failed to save order.', 'danger');
      },
    };
  });
}

export function injectAddFollowedMutation() {
  const http = inject(HttpClient);
  const toastService = inject(ToastService);
  const queryClient = inject(QueryClient);

  return injectMutation(() => {
    return {
      mutationKey: ['followed-symbols'],
      mutationFn: (dto: CreateFollowedSymbolDto) =>
        lastValueFrom(
          http
            .post<
              BaseResponse<FollowedSymbolDto>
            >(`${ENV.BACKEND_URL}/api/v1/followed-symbols`, dto, { ...useAuth() })
            .pipe(map((res) => res.result)),
        ),
      onSuccess: () => {
        toastService.show(`Added`, 'success', 5000);

        queryClient.invalidateQueries({
          queryKey: ['followed-symbols'],
        });
      },
      onError: () => {
        toastService.show('Failed to save order.', 'danger');
      },
    };
  });
}
