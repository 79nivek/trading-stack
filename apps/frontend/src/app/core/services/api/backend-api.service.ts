import { skipSpinnerOptions } from '../../interceptors/spinner.interceptor';
import { Router } from '@angular/router';
import { Injectable, OnDestroy, OnInit, inject, signal } from '@angular/core';

export interface BaseResponse<T> {
  id: string;
  result: T;
  duration: number;
}

import { HttpClient } from '@angular/common/http';
import { tap, catchError, map } from 'rxjs/operators';
import { Observable, of, interval, Subscription } from 'rxjs';
import { StorageService } from '../storage.service';
import { SecretKeyService } from '../secret-key.service';

import { APP_PATHS } from '../../constants/routes.constants';
import { ENV } from '../../../environments';
import {
  TokenSuggestionDto,
  SuggestionPositionResponseDto,
  PlacePositionDto,
  FollowedSymbolDto,
  CreateFollowedSymbolDto,
  ReorderFollowedSymbolsDto,
  KlineData,
  AccountInfoResponse,
  UserSettingsResDto,
} from '@trading-stack/shared-dto';
import { TradingFormatter } from '../../../shared/classes/trading-formater';
import { TimeframeService } from '../timeframe.service';

export interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class BackendApiService implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private secretKeyService = inject(SecretKeyService);
  private router = inject(Router);

  private timeframeServ = inject(TimeframeService);

  isAuthenticated = signal<boolean>(!!this.storage.token.get());
  currentUser = signal<UserProfile | null>(null);

  private isTokenVerified = false;
  private pollSub?: Subscription;

  ngOnInit() {
    if (this.storage.token.get()) {
      this.startPolling();
    }
  }

  ngOnDestroy() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = undefined;
    }
  }

  private useAuth(withMasterToken = false) {
    const token = this.storage.token.get();
    const headers: any = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (withMasterToken) {
      const masterToken = this.secretKeyService.token;
      if (masterToken) {
        headers['x-master-token'] = masterToken;
      }
    }

    return {
      headers,
    };
  }

  login(credentials: any): Observable<any> {
    return this.http
      .post<
        BaseResponse<any>
      >(`${ENV.BACKEND_URL}/api/v1/auth/login`, credentials)
      .pipe(
        map((res) => res.result),
        tap((response: any) => {
          if (response.access_token) {
            this.storage.token.set(response.access_token);
            this.isAuthenticated.set(true);
            this.isTokenVerified = true;
            this.startPolling();
          }
        }),
      );
  }

  logout() {
    if (this.storage.token.get()) {
      this.http
        .post<
          BaseResponse<any>
        >(`${ENV.BACKEND_URL}/api/v1/auth/logout`, {}, { ...this.useAuth(), ...skipSpinnerOptions() })
        .subscribe({
          next: () => this.clearSession(),
          error: () => this.clearSession(),
        });
    } else {
      this.clearSession();
    }
  }

  private clearSession() {
    this.storage.token.clear();
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.isTokenVerified = false;
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = undefined;
    }
    this.router.navigate([APP_PATHS.LOGIN]);
  }

  private startPolling() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
    }
    this.pollSub = interval(60000).subscribe(() => {
      this.http
        .get<BaseResponse<any>>(`${ENV.BACKEND_URL}/api/v1/auth/check`, {
          ...this.useAuth(),
          ...skipSpinnerOptions(),
        })
        .subscribe({
          error: (err) => {
            if (err.status === 401) {
              this.logout();
            }
          },
        });
    });
  }

  getKlines(
    symbol: string,
    query: {
      limit?: number;
      endTime?: number;
    },
    formatOptions: {
      tickSize: string | number;
      pricePrecision: number;
    } = {
      tickSize: '1',
      pricePrecision: 0,
    },
  ): Observable<KlineData[]> {
    if (query.limit === undefined) query.limit = 500;
    const tf = this.timeframeServ.timeframe();

    const params: any = {
      symbol: symbol.toUpperCase(),
      interval: tf,
      limit: query.limit.toString(),
    };

    if (query.endTime) {
      params.endTime = query.endTime.toString();
    }

    return this.http
      .get<BaseResponse<any[][]>>(
        `${ENV.BACKEND_URL}/api/v1/market-data/klines/futures`,
        {
          params,
          ...skipSpinnerOptions(),
        },
      )
      .pipe(
        map((res: any) => res.result || res),
        map((data) => {
          return data.map((kline: any) => ({
            time: Math.floor(kline[0] / 1000), // convert ms to s for lightweight-charts
            open: TradingFormatter.formatPrice(kline[1], formatOptions),
            high: TradingFormatter.formatPrice(kline[2], formatOptions),
            low: TradingFormatter.formatPrice(kline[3], formatOptions),
            close: TradingFormatter.formatPrice(kline[4], formatOptions),
            volume: TradingFormatter.formatPrice(kline[5], formatOptions),
            normalizedToken: `${symbol.toLowerCase()}@kline_${tf}`,
          }));
        }),
      );
  }

  getMe(): Observable<boolean> {
    if (!this.storage.token.get()) {
      this.isAuthenticated.set(false);
      return of(false);
    }

    if (this.isTokenVerified && this.currentUser()) {
      return of(true);
    }

    return this.http
      .get<BaseResponse<UserProfile>>(`${ENV.BACKEND_URL}/api/v1/users/me`, {
        ...this.useAuth(),
        ...skipSpinnerOptions(),
      })
      .pipe(
        map((res) => res.result),
        map((user) => {
          this.isTokenVerified = true;
          this.isAuthenticated.set(true);
          this.currentUser.set(user);
          this.startPolling();
          return true;
        }),
        catchError(() => {
          this.logout();
          return of(false);
        }),
      );
  }

  signUp(data: any): Observable<any> {
    return this.http
      .post<BaseResponse<any>>(`${ENV.BACKEND_URL}/api/v1/auth/sign-up`, data, {
        ...skipSpinnerOptions(),
      })
      .pipe(map((res) => res.result));
  }

  resetPassword(data: any): Observable<any> {
    return this.http
      .post<
        BaseResponse<any>
      >(`${ENV.BACKEND_URL}/api/v1/auth/reset-password`, data, { ...this.useAuth(), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }

  updateProfile(data: any): Observable<any> {
    return this.http
      .patch<BaseResponse<any>>(`${ENV.BACKEND_URL}/api/v1/users`, data, {
        ...this.useAuth(),
        ...skipSpinnerOptions(),
      })
      .pipe(map((res) => res.result));
  }

  getSettings(): Observable<UserSettingsResDto> {
    return this.http
      .get<BaseResponse<UserSettingsResDto>>(`${ENV.BACKEND_URL}/api/v1/settings`, {
        ...this.useAuth(),
        ...skipSpinnerOptions(),
      })
      .pipe(map((res) => res.result));
  }

  updateSettings(config: {
    language?: string;
    theme?: string;
    timeFrame?: string;
    suggestionLimit?: number;
  }): Observable<any> {
    return this.http
      .patch<BaseResponse<any>>(`${ENV.BACKEND_URL}/api/v1/settings`, config, {
        ...this.useAuth(),
        ...skipSpinnerOptions(),
      })
      .pipe(map((res) => res.result));
  }

  checkBinanceCredentials(data: any): Observable<any> {
    return this.http
      .post<
        BaseResponse<any>
      >(`${ENV.BACKEND_URL}/api/v1/binance-credentials/check`, data, { ...this.useAuth(), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }

  saveBinanceCredentials(data: any): Observable<{ token: string }> {
    return this.http
      .post<
        BaseResponse<{ token: string }>
      >(`${ENV.BACKEND_URL}/api/v1/binance-credentials/save`, data, { ...this.useAuth(), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }

  checkMasterToken(masterToken: string): Observable<any> {
    return this.http
      .post<
        BaseResponse<any>
      >(`${ENV.BACKEND_URL}/api/v1/binance-credentials/check-token`, { masterToken }, { ...this.useAuth(), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }

  getFuturesSuggestions(limit = 10): Observable<TokenSuggestionDto[]> {
    return this.http
      .get<
        BaseResponse<TokenSuggestionDto[]>
      >(`${ENV.BACKEND_URL}/api/v1/suggestions/futures?limit=${limit}`, { ...this.useAuth(), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }

  getAiCheck(symbol: string, timeFrame = '4h'): Observable<any> {
    return this.http
      .get<
        BaseResponse<any>
      >(`${ENV.BACKEND_URL}/api/v1/suggestions/ai-check?symbol=${symbol}&timeFrame=${timeFrame}`, { ...this.useAuth(), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }

  getListenKey(): Observable<string> {
    return this.http
      .get<
        BaseResponse<{ listenKey: string }>
      >(`${ENV.BACKEND_URL}/api/v1/binance-credentials/listen-key`, { ...this.useAuth(true), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result.listenKey));
  }

  getFuturesAccountInfo(): Observable<AccountInfoResponse> {
    return this.http
      .get<
        BaseResponse<any>
      >(`${ENV.BACKEND_URL}/api/v1/binance-credentials/futures/account-info`, { ...this.useAuth(true), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }

  getBinanceFuturesBalance(): Observable<{ ok: boolean; balance: number }> {
    return this.http
      .get<
        BaseResponse<{ ok: boolean; balance: number }>
      >(`${ENV.BACKEND_URL}/api/v1/binance-credentials/futures/balance`, { ...this.useAuth(true) })
      .pipe(map((res) => res.result));
  }

  getSuggestionPosition(
    symbol: string,
    balance: number | null,
  ): Observable<SuggestionPositionResponseDto> {
    const payload: any = { symbol };
    if (balance) payload.balance = balance;

    return this.http
      .post<
        BaseResponse<SuggestionPositionResponseDto>
      >(`${ENV.BACKEND_URL}/api/v1/suggestions/position`, payload, { ...this.useAuth(true) })
      .pipe(map((res) => res.result));
  }

  placeFuturesPosition(setup: PlacePositionDto): Observable<any> {
    return this.http
      .post<
        BaseResponse<any>
      >(`${ENV.BACKEND_URL}/api/v1/binance-credentials/place-position`, setup, { ...this.useAuth(true) })
      .pipe(map((res) => res.result));
  }

  // ─── Followed Symbols ─────────────────────────────────────────────────────

  getFollowedSymbols(): Observable<FollowedSymbolDto[]> {
    return this.http
      .get<
        BaseResponse<FollowedSymbolDto[]>
      >(`${ENV.BACKEND_URL}/api/v1/followed-symbols`, { ...this.useAuth() })
      .pipe(map((res) => res.result));
  }

  addFollowedSymbol(
    dto: CreateFollowedSymbolDto,
  ): Observable<FollowedSymbolDto> {
    return this.http
      .post<
        BaseResponse<FollowedSymbolDto>
      >(`${ENV.BACKEND_URL}/api/v1/followed-symbols`, dto, { ...this.useAuth() })
      .pipe(map((res) => res.result));
  }

  removeFollowedSymbol(id: string): Observable<void> {
    return this.http
      .delete<
        BaseResponse<void>
      >(`${ENV.BACKEND_URL}/api/v1/followed-symbols/${id}`, { ...this.useAuth() })
      .pipe(map((res) => res.result));
  }

  getFollowedSymbolsData(): Observable<TokenSuggestionDto[]> {
    return this.http
      .get<
        BaseResponse<TokenSuggestionDto[]>
      >(`${ENV.BACKEND_URL}/api/v1/followed-symbols/data`, { ...this.useAuth() })
      .pipe(map((res) => res.result));
  }

  reorderFollowedSymbols(dto: ReorderFollowedSymbolsDto): Observable<void> {
    return this.http
      .patch<
        BaseResponse<void>
      >(`${ENV.BACKEND_URL}/api/v1/followed-symbols/reorder`, dto, { ...this.useAuth(), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }
}
