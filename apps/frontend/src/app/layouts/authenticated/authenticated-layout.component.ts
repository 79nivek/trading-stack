import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { effect } from '@angular/core';
import { Component, signal, inject } from '@angular/core';
import { PageTitleStrategy } from '../../core/strategies/page-title.strategy';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../shared/components/lang-toggle/lang-toggle.component';
import { TimeframeSelectorComponent } from '../../shared/components/timeframe-selector/timeframe-selector.component';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';
import {
  DropdownComponent,
  DropdownItem,
} from '../../shared/components/dropdown/dropdown.component';
import { BackendApiService } from '../../core/services/api/backend-api.service';
import { APP_PATHS } from '../../core/constants/routes.constants';
import { SecretKeyService } from '../../core/services/secret-key.service';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService, THEME } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { TimeframeService } from '../../core/services/timeframe.service';
import { FormsModule } from '@angular/forms';
import { LayoutService } from '../../core/services/layout.service';
import { AccountService } from '../../core/services/account.service';
import { TIME_FRAME } from '@trading-stack/shared-dto';
import { UserDataWsService } from '../../core/services/api/user-data-ws.service';

@Component({
  selector: 'app-authenticated-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleComponent,
    LangToggleComponent,
    TimeframeSelectorComponent,
    TranslatePipe,
    TranslateDirective,
    DropdownComponent,
    FormsModule,
  ],
  templateUrl: './authenticated-layout.component.html',
  styleUrl: './authenticated-layout.component.scss',
})
export class AuthenticatedLayoutComponent {
  isSidebarOpen = signal<boolean>(false);
  private router = inject(Router);
  public secretKeyService = inject(SecretKeyService);
  private toastService = inject(ToastService);

  private themeService = inject(ThemeService);
  private langService = inject(LanguageService);
  private timeframeService = inject(TimeframeService);
  public pageTitleStrategy = inject(PageTitleStrategy);
  public accountService = inject(AccountService);
  public authService = inject(BackendApiService);

  private userDataWsService = inject(UserDataWsService);

  public layoutService = inject(LayoutService);

  masterTokenInput = '';
  isVerifyingToken = false;
  isHeaderVisible = signal<boolean>(true);

  menuItems = [
    { path: APP_PATHS.DASHBOARD, label: 'MENU.DASHBOARD', icon: 'D' },
    {
      path: APP_PATHS.CURRENTLY_TRADING,
      label: 'MENU.CURRENTLY_TRADING',
      icon: 'C',
    },
    { path: APP_PATHS.FOLLOWED, label: 'MENU.FOLLOWED', icon: 'F' },
    { path: APP_PATHS.SUGGESTION, label: 'MENU.SUGGESTION', icon: 'S' },
    { path: APP_PATHS.SETTING, label: 'MENU.SETTING', icon: '⚙' },
  ];

  profileMenu: DropdownItem[] = [
    { label: 'HEADER_PROFILE.PROFILE', action: 'profile' },
    { label: 'HEADER_PROFILE.CHANGE_PASSWORD', action: 'change-password' },
    { label: '', action: 'divider', divider: true },
    { label: 'HEADER_PROFILE.LOGOUT', action: 'logout' },
  ];

  settingsQuery = injectQuery(() => ({
    queryKey: ['settings'],
    queryFn: () => lastValueFrom(this.authService.getSettings()),
  }));

  verifyTokenMutation = injectMutation(() => ({
    mutationFn: (token: string) =>
      lastValueFrom(this.authService.checkMasterToken(token)),
    onSuccess: (res, token) => {
      if (res.ok) {
        this.secretKeyService.setToken(token);
        this.masterTokenInput = '';
        this.toastService.show('Token activated successfully', 'success');
      } else {
        this.toastService.show('Failed to verify token', 'danger');
      }
    },
    onError: (err: any) => {
      this.toastService.show(
        err.error?.message || 'Invalid Master Token',
        'danger',
      );
    },
  }));

  constructor() {
    this.userDataWsService.temp();
    effect(() => {
      console.log('pageTitle', this.pageTitleStrategy.pageTitle());
      const settings = this.settingsQuery.data();
      if (settings) {
        if (settings.theme)
          this.themeService.setTheme(settings.theme as THEME, false);
        if (settings.language)
          this.langService.setLanguage(settings.language, false);
        if (settings.timeFrame)
          this.timeframeService.setTimeframe(
            settings.timeFrame as TIME_FRAME,
            false,
          );
      }
    });
  }

  toggleSidebar() {
    this.isSidebarOpen.update((v) => !v);
  }

  toggleHeader() {
    this.isHeaderVisible.update((v) => !v);
  }

  handleProfileMenuAction(action: string) {
    if (action === 'logout') {
      this.authService.logout();
    } else if (action === 'profile') {
      this.router.navigate([APP_PATHS.SETTING_PROFILE]);
    }
  }

  onSaveMasterToken() {
    const token = this.masterTokenInput.trim();
    if (token) {
      this.verifyTokenMutation.mutate(token);
    }
  }
}
