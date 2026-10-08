import { inject } from '@angular/core';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, map } from 'rxjs';
import { BaseResponse, useAuth } from '../services/api/backend-api.service';
import { ENV } from '../../environments';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';
import { SignUpDto } from '@trading-stack/shared-dto';

export function injectSignUpMutation() {
  const http = inject(HttpClient);

  return injectMutation(() => ({
    mutationKey: ['sign-up'],
    mutationFn: (data: SignUpDto) =>
      lastValueFrom(
        http
          .post<BaseResponse<any>>(
            `${ENV.BACKEND_URL}/api/v1/auth/sign-up`,
            data,
            {
              ...skipSpinnerOptions(),
            },
          )
          .pipe(map((res) => res.result)),
      ),
  }));
}

export function injectResetPasswordMutation() {
  const http = inject(HttpClient);

  return injectMutation(() => ({
    mutationKey: ['reset-password'],
    mutationFn: (data: any) =>
      lastValueFrom(
        http
          .post<BaseResponse<any>>(
            `${ENV.BACKEND_URL}/api/v1/auth/reset-password`,
            data,
            {
              ...useAuth(),
              ...skipSpinnerOptions(),
            },
          )
          .pipe(map((res) => res.result)),
      ),
  }));
}

export function injectUpdateProfileMutation() {
  const http = inject(HttpClient);
  return injectMutation(() => ({
    mutationKey: ['update-profile'],
    mutationFn: (data: any) =>
      lastValueFrom(
        http
          .patch<BaseResponse<any>>(`${ENV.BACKEND_URL}/api/v1/users`, data, {
            ...useAuth(),
            ...skipSpinnerOptions(),
          })
          .pipe(map((res) => res.result)),
      ),
  }));
}
