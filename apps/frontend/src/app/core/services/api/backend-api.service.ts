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
import {
  masterTokenStorageInstance,
  tokenStorageInstance,
} from '../storage.service';

import { APP_PATHS } from '../../constants/routes.constants';
import { ENV } from '../../../environments';

export interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function useAuth(withMasterToken = false) {
  const token = tokenStorageInstance.get();
  const headers: any = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (withMasterToken) {
    const masterToken = masterTokenStorageInstance.get();
    if (masterToken) {
      headers['x-master-token'] = masterToken;
    }
  }

  return {
    headers,
  };
}

@Injectable({
  providedIn: 'root',
})
export class BackendApiService implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);

  isAuthenticated = signal<boolean>(!!tokenStorageInstance.get());
  currentUser = signal<UserProfile | null>(null);

  private isTokenVerified = false;
  private pollSub?: Subscription;

  ngOnInit() {
    if (tokenStorageInstance.get()) {
      this.startPolling();
    }
  }

  ngOnDestroy() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = undefined;
    }
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
            tokenStorageInstance.set(response.access_token);
            this.isAuthenticated.set(true);
            this.isTokenVerified = true;
            this.startPolling();
          }
        }),
      );
  }

  logout(withCallback = false) {
    if (tokenStorageInstance.get()) {
      this.http
        .post<
          BaseResponse<any>
        >(`${ENV.BACKEND_URL}/api/v1/auth/logout`, {}, { ...useAuth(), ...skipSpinnerOptions() })
        .subscribe({
          next: () => this.clearSession(withCallback),
          error: () => this.clearSession(withCallback),
        });
    } else {
      this.clearSession(withCallback);
    }
  }

  private clearSession(withCallback = false) {
    tokenStorageInstance.clear();
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.isTokenVerified = false;
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = undefined;
    }

    if (
      withCallback &&
      this.router.url &&
      !this.router.url.includes(APP_PATHS.LOGIN)
    ) {
      this.router.navigate([APP_PATHS.LOGIN], {
        queryParams: { callback: this.router.url },
      });
    } else {
      this.router.navigate([APP_PATHS.LOGIN]);
    }
  }

  private startPolling() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
    }
    this.pollSub = interval(60000).subscribe(() => {
      this.http
        .get<BaseResponse<any>>(`${ENV.BACKEND_URL}/api/v1/auth/check`, {
          ...useAuth(),
          ...skipSpinnerOptions(),
        })
        .subscribe({
          error: (err) => {
            if (err.status === 401) {
              this.logout(true);
            }
          },
        });
    });
  }

  getMe(): Observable<boolean> {
    if (!tokenStorageInstance.get()) {
      this.isAuthenticated.set(false);
      return of(false);
    }

    if (this.isTokenVerified && this.currentUser()) {
      return of(true);
    }

    return this.http
      .get<BaseResponse<UserProfile>>(`${ENV.BACKEND_URL}/api/v1/users/me`, {
        ...useAuth(),
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

  checkBinanceCredentials(data: any): Observable<any> {
    return this.http
      .post<
        BaseResponse<any>
      >(`${ENV.BACKEND_URL}/api/v1/binance/credentials/check`, data, { ...useAuth(), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }

  saveBinanceCredentials(data: any): Observable<{ token: string }> {
    return this.http
      .post<
        BaseResponse<{ token: string }>
      >(`${ENV.BACKEND_URL}/api/v1/binance/credentials/save`, data, { ...useAuth(), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }

  checkMasterToken(masterToken: string): Observable<any> {
    return this.http
      .post<
        BaseResponse<any>
      >(`${ENV.BACKEND_URL}/api/v1/binance/credentials/master-token/check`, { masterToken }, { ...useAuth(), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }

  getAiCheck(symbol: string, timeFrame = '4h'): Observable<any> {
    return this.http
      .get<
        BaseResponse<any>
      >(`${ENV.BACKEND_URL}/api/v1/suggestions/ai-check?symbol=${symbol}&timeFrame=${timeFrame}`, { ...useAuth(), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result));
  }

  getListenKey(): Observable<string> {
    return this.http
      .get<
        BaseResponse<{ listenKey: string }>
      >(`${ENV.BACKEND_URL}/api/v1/binance/credentials/listen-key`, { ...useAuth(true), ...skipSpinnerOptions() })
      .pipe(map((res) => res.result.listenKey));
  }
}
