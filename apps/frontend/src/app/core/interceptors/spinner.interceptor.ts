import { HttpContext, HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { SpinnerService } from '../services/spinner.service';

export const SKIP_SPINNER = new HttpContextToken<boolean>(() => false);

export const spinnerInterceptor: HttpInterceptorFn = (req, next) => {
  const spinnerService = inject(SpinnerService);

  if (!req.context.get(SKIP_SPINNER)) {
    spinnerService.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (!req.context.get(SKIP_SPINNER)) {
        spinnerService.hide();
      }
    })
  );
};

export function skipSpinnerOptions() {
  return {
    context: new HttpContext().set(SKIP_SPINNER, true),
  };
}
