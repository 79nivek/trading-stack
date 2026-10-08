import { inject, Signal } from '@angular/core';
import {
  injectQuery,
  injectMutation,
} from '@tanstack/angular-query-experimental';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, map } from 'rxjs';
import { BaseResponse, useAuth } from '../services/api/backend-api.service';
import { ENV } from '../../environments';
import {
  TokenSuggestionDto,
  SuggestionPositionResponseDto,
} from '@trading-stack/shared-dto';

export function injectSuggestionsQuery(limit: Signal<number | undefined>) {
  const http = inject(HttpClient);
  return injectQuery(() => {
    const lim = limit();
    return {
      queryKey: ['suggestions', lim],
      queryFn: () =>
        lastValueFrom(
          http
            .get<
              BaseResponse<TokenSuggestionDto[]>
            >(`${ENV.BACKEND_URL}/api/v1/suggestions/futures?limit=${lim}`, { ...useAuth() })
            .pipe(map((res) => res.result)),
        ),
      enabled: !!lim,
      structuralSharing: false,
    };
  });
}

export function injectSuggestionPositionMutation() {
  const http = inject(HttpClient);
  return injectMutation(() => ({
    mutationKey: ['suggestion-position'],
    mutationFn: (params: { symbol: string; balance: number | null }) => {
      const payload: any = { symbol: params.symbol };
      if (params.balance) payload.balance = params.balance;

      return lastValueFrom(
        http
          .post<
            BaseResponse<SuggestionPositionResponseDto>
          >(`${ENV.BACKEND_URL}/api/v1/suggestions/position`, payload, { ...useAuth(true) })
          .pipe(map((res) => res.result)),
      );
    },
  }));
}
