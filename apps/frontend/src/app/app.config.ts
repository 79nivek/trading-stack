import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { spinnerInterceptor } from './core/interceptors/spinner.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

import { provideAngularQuery, QueryClient } from '@tanstack/angular-query-experimental';

export class CustomTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}
  getTranslation(lang: string): Observable<any> {
    return this.http.get(`/public/i18n/${lang}.json`).pipe(
      catchError(() => of({})) // Return empty object on error to prevent infinite loops
    );
  }
}

const queryClient = new QueryClient();

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([spinnerInterceptor, errorInterceptor])),
    provideAngularQuery(queryClient),
    provideTranslateService({
      fallbackLang: 'en',
      lang: 'en',
      loader: {
        provide: TranslateLoader,
        useClass: CustomTranslateLoader,
        deps: [HttpClient],
      },
    }),
  ],
};
