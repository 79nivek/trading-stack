import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';
import { Router } from '@angular/router';
import { Injectable, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, map } from 'rxjs/operators';
import { Observable, of, interval, Subscription } from 'rxjs';
import { StorageService } from './storage.service';
import { ThemeService, Theme } from './theme.service';
import { LanguageService } from './language.service';
import { APP_PATHS } from '../constants/routes.constants';

export interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  theme?: string;
  language?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BackendApiService implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private langService = inject(LanguageService);

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

  login(credentials: any): Observable<any> {
    return this.http.post('/api/v1/auth/login', credentials).pipe(
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
      this.http.post('/api/v1/auth/logout', {}).subscribe({
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
    this.pollSub = interval(10000).subscribe(() => {
      this.http.get('/api/v1/auth/check', skipSpinnerOptions()).subscribe({
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

    return this.http.get<UserProfile>('/api/v1/users/me').pipe(
      map((user) => {
        this.isTokenVerified = true;
        this.isAuthenticated.set(true);
        this.currentUser.set(user);

        if (user.theme) {
          this.themeService.setTheme(user.theme as Theme, false);
        }
        if (user.language) {
          this.langService.setLanguage(user.language, false);
        }

        this.startPolling();
        return true;
      }),
      catchError(() => {
        this.logout();
        return of(false);
      }),
    );
  }

  getToken(): string | null {
    return this.storage.token.get();
  }

  signUp(data: any): Observable<any> {
    return this.http.post('/api/v1/auth/sign-up', data);
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post('/api/v1/auth/reset-password', data);
  }

  updateProfile(data: any): Observable<any> {
    return this.http.patch('/api/v1/users', data);
  }

  updateConfig(config: { language?: string; theme?: string }): Observable<any> {
    return this.http.patch('/api/v1/users/config', config);
  }
}
