import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { UnauthenticatedLayoutComponent } from './layouts/unauthenticated/unauthenticated-layout.component';
import { AuthenticatedLayoutComponent } from './layouts/authenticated/authenticated-layout.component';
import { APP_ROUTES } from './core/constants/routes.constants';

export const routes: Routes = [
  {
    path: '',
    redirectTo: APP_ROUTES.DASHBOARD,
    pathMatch: 'full'
  },
  {
    path: '',
    component: UnauthenticatedLayoutComponent,
    children: [
      {
        path: APP_ROUTES.LOGIN,
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginPageComponent)
      },
      {
        path: APP_ROUTES.SIGN_UP,
        loadComponent: () => import('./pages/sign-up/sign-up.component').then(m => m.SignUpPageComponent)
      }
    ]
  },
  {
    path: '',
    component: AuthenticatedLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: APP_ROUTES.DASHBOARD,
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardPageComponent)
      },
      {
        path: APP_ROUTES.CURRENTLY_TRADING,
        loadComponent: () => import('./pages/currently-trading/currently-trading.component').then(m => m.CurrentlyTradingPageComponent)
      },
      {
        path: APP_ROUTES.FOLLOWED,
        loadComponent: () => import('./pages/followed/followed.component').then(m => m.FollowedPageComponent)
      },
      {
        path: APP_ROUTES.SUGGESTION,
        loadComponent: () => import('./pages/suggestion/suggestion.component').then(m => m.SuggestionPageComponent)
      },
      {
        path: APP_ROUTES.SETTING,
        loadComponent: () => import('./pages/setting/setting.component').then(m => m.SettingPageComponent)
      },
      {
        path: APP_ROUTES.SETTING_PROFILE,
        loadComponent: () => import('./pages/setting/profile/profile.component').then(m => m.ProfilePageComponent)
      },
      {
        path: '',
        redirectTo: APP_ROUTES.DASHBOARD,
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: APP_ROUTES.DASHBOARD
  }
];
