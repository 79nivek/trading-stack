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
  UpdateSettingsDto,
  UserSettingsResDto,
} from '@trading-stack/shared-dto';
import { ENV } from '../../environments';
import { skipSpinnerOptions } from '../interceptors/spinner.interceptor';
import { ToastService } from '../services/toast.service';
import { ModalService } from '../services/modal.service';

export function injectSettingQuery() {
  const http = inject(HttpClient);

  return injectQuery(() => ({
    queryKey: ['user-settings'],
    queryFn: () =>
      lastValueFrom(
        http
          .get<BaseResponse<UserSettingsResDto>>(
            `${ENV.BACKEND_URL}/api/v1/settings`,
            {
              ...useAuth(),
              ...skipSpinnerOptions(),
            },
          )
          .pipe(map((res) => res.result)),
      ),
  }));
}

export function injectSettingsMutation() {
  const http = inject(HttpClient);
  const toastService = inject(ToastService);
  const queryClient = inject(QueryClient);
  const modalService = inject(ModalService);

  return injectMutation(() => ({
    mutationKey: ['user-settings'],
    mutationFn: (body: Partial<UpdateSettingsDto>) =>
      lastValueFrom(
        http
          .patch<
            BaseResponse<any>
          >(`${ENV.BACKEND_URL}/api/v1/settings`, body, { ...useAuth(true) })
          .pipe(map((res) => res.result)),
      ),
    onSuccess: () => {
      toastService.show('UI settings saved successfully!', 'success');
      modalService.close();
      queryClient.invalidateQueries({
        queryKey: ['user-settings'],
      });
    },
    onError: (err: any) => {
      toastService.show(
        err.error?.message || 'Failed to save UI settings.',
        'danger',
      );
    },
  }));
}
