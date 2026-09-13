import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BackendApiService } from '../services/backend-api.service';
import { APP_PATHS } from '../constants/routes.constants';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const authService = inject(BackendApiService);
  const router = inject(Router);

  return authService.getMe().pipe(
    map(isValid => {
      if (isValid) {
        return true;
      }
      return router.parseUrl(APP_PATHS.LOGIN);
    })
  );
};
