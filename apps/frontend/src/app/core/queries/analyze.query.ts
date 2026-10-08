import { inject, Signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { BaseResponse, useAuth } from '../services/api/backend-api.service';
import { lastValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ENV } from '../../environments';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';
import {
  LlmAnalyzeTokenResponseDto,
  TokenSuggestionDto,
} from '@trading-stack/shared-dto';

export function injectQuantAnalyzeTokenQuery(
  symbol: Signal<string | undefined>,
) {
  const http = inject(HttpClient);
  return injectQuery(() => {
    const sym = symbol();
    return {
      queryKey: ['quant-analyze-token', sym],
      queryFn: () => {
        return lastValueFrom(
          http
            .get<
              BaseResponse<TokenSuggestionDto>
            >(`${ENV.BACKEND_URL}/api/v1/analyze/quantitative/${sym}`, { ...useAuth(), ...skipSpinnerOptions() })
            .pipe(map((res) => res.result)),
        );
      },
      retry: true,
      enabled: !!sym,
      structuralSharing: false,
    };
  });
}

export function injectLlmAnalyzeTokenQuery(symbol: Signal<string | undefined>) {
  const http = inject(HttpClient);
  return injectQuery(() => {
    const sym = symbol();
    return {
      queryKey: ['llm-analyze-token', sym],
      queryFn: () => {
        return lastValueFrom(
          http
            .get<
              BaseResponse<LlmAnalyzeTokenResponseDto>
            >(`${ENV.BACKEND_URL}/api/v1/analyze/llm/${sym}`, { ...useAuth(), ...skipSpinnerOptions() })
            .pipe(map((res) => res.result)),
        );
      },
      enabled: false,
      retry: false,
      structuralSharing: false,
    };
  });
}
