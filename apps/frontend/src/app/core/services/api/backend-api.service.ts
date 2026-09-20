import { skipSpinnerOptions } from '../../interceptors/spinner.interceptor';
import { Router } from '@angular/router';
import { Injectable, OnDestroy, OnInit, inject, signal } from '@angular/core';
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
} from '@trading-stack/shared-dto';

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
      .post(`${ENV.BACKEND_URL}/api/v1/auth/login`, credentials, {
        ...skipSpinnerOptions(),
      })
      .pipe(
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
        .post(
          `${ENV.BACKEND_URL}/api/v1/auth/logout`,
          {},
          { ...this.useAuth(), ...skipSpinnerOptions() },
        )
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
        .get(`${ENV.BACKEND_URL}/api/v1/auth/check`, {
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

  getMe(): Observable<boolean> {
    if (!this.storage.token.get()) {
      this.isAuthenticated.set(false);
      return of(false);
    }

    if (this.isTokenVerified && this.currentUser()) {
      return of(true);
    }

    return this.http
      .get<UserProfile>(`${ENV.BACKEND_URL}/api/v1/users/me`, {
        ...this.useAuth(),
        ...skipSpinnerOptions(),
      })
      .pipe(
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
    return this.http.post(`${ENV.BACKEND_URL}/api/v1/auth/sign-up`, data, {
      ...skipSpinnerOptions(),
    });
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(
      `${ENV.BACKEND_URL}/api/v1/auth/reset-password`,
      data,
      { ...this.useAuth(), ...skipSpinnerOptions() },
    );
  }

  updateProfile(data: any): Observable<any> {
    return this.http.patch(`${ENV.BACKEND_URL}/api/v1/users`, data, {
      ...this.useAuth(),
      ...skipSpinnerOptions(),
    });
  }

  getSettings(): Observable<any> {
    return this.http.get(`${ENV.BACKEND_URL}/api/v1/settings`, {
      ...this.useAuth(),
      ...skipSpinnerOptions(),
    });
  }

  updateSettings(config: {
    language?: string;
    theme?: string;
    timeFrame?: string;
    suggestionLimit?: number;
  }): Observable<any> {
    return this.http.patch(`${ENV.BACKEND_URL}/api/v1/settings`, config, {
      ...this.useAuth(),
      ...skipSpinnerOptions(),
    });
  }

  checkBinanceCredentials(data: any): Observable<any> {
    return this.http.post(
      `${ENV.BACKEND_URL}/api/v1/binance-credentials/check`,
      data,
      { ...this.useAuth(), ...skipSpinnerOptions() },
    );
  }

  saveBinanceCredentials(data: any): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(
      `${ENV.BACKEND_URL}/api/v1/binance-credentials/save`,
      data,
      { ...this.useAuth(), ...skipSpinnerOptions() },
    );
  }

  checkMasterToken(masterToken: string): Observable<any> {
    return this.http.post(
      `${ENV.BACKEND_URL}/api/v1/binance-credentials/check-token`,
      { masterToken },
      { ...this.useAuth(), ...skipSpinnerOptions() },
    );
  }

  getFuturesSuggestions(limit = 10): Observable<TokenSuggestionDto[]> {
    return this.http.get<TokenSuggestionDto[]>(
      `${ENV.BACKEND_URL}/api/v1/suggestions/futures?limit=${limit}`,
      { ...this.useAuth(), ...skipSpinnerOptions() },
    );
  }

  getAiCheck(symbol: string, timeFrame = '4h'): Observable<any> {
    return this.http.get<any>(
      `${ENV.BACKEND_URL}/api/v1/suggestions/ai-check?symbol=${symbol}&timeFrame=${timeFrame}`,
      { ...this.useAuth(), ...skipSpinnerOptions() },
    );
  }

  getBinanceFuturesBalance(): Observable<{ ok: boolean; balance: number }> {
    return this.http.post<{ ok: boolean; balance: number }>(
      `${ENV.BACKEND_URL}/api/v1/binance-credentials/futures/balance`,
      { ...this.useAuth(true) },
    );
  }

  getSuggestionPosition(
    symbol: string,
    balance: number | null,
  ): Observable<SuggestionPositionResponseDto> {
    const payload: any = { symbol };
    if (balance) payload.balance = balance;

    return this.http.post<SuggestionPositionResponseDto>(
      `${ENV.BACKEND_URL}/api/v1/suggestions/position`,
      payload,
      { ...this.useAuth(true) },
    );
  }

  placeFuturesPosition(setup: PlacePositionDto): Observable<any> {
    return this.http.post<any>(
      `${ENV.BACKEND_URL}/api/v1/binance-credentials/place-position`,
      setup,
      { ...this.useAuth(true) },
    );
  }

  // ─── Followed Symbols ─────────────────────────────────────────────────────

  getFollowedSymbols(): Observable<FollowedSymbolDto[]> {
    return this.http.get<FollowedSymbolDto[]>(
      `${ENV.BACKEND_URL}/api/v1/followed-symbols`,
      { ...this.useAuth(), ...skipSpinnerOptions() },
    );
  }

  addFollowedSymbol(dto: CreateFollowedSymbolDto): Observable<FollowedSymbolDto> {
    return this.http.post<FollowedSymbolDto>(
      `${ENV.BACKEND_URL}/api/v1/followed-symbols`,
      dto,
      { ...this.useAuth(), ...skipSpinnerOptions() },
    );
  }

  removeFollowedSymbol(id: string): Observable<void> {
    return this.http.delete<void>(
      `${ENV.BACKEND_URL}/api/v1/followed-symbols/${id}`,
      { ...this.useAuth(), ...skipSpinnerOptions() },
    );
  }

  getFollowedSymbolsData(): Observable<TokenSuggestionDto[]> {
    return this.http.get<TokenSuggestionDto[]>(
      `${ENV.BACKEND_URL}/api/v1/followed-symbols/data`,
      { ...this.useAuth(), ...skipSpinnerOptions() },
    );
  }

  reorderFollowedSymbols(dto: ReorderFollowedSymbolsDto): Observable<void> {
    return this.http.patch<void>(
      `${ENV.BACKEND_URL}/api/v1/followed-symbols/reorder`,
      dto,
      { ...this.useAuth(), ...skipSpinnerOptions() },
    );
  }
}
