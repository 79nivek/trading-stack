import { injectMutation } from '@tanstack/angular-query-experimental';
import { interval, lastValueFrom, Subscription } from 'rxjs';
import { effect, OnDestroy, OnInit } from '@angular/core';
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../shared/components/lang-toggle/lang-toggle.component';
import { TimeframeSelectorComponent } from '../../shared/components/timeframe-selector/timeframe-selector.component';
import { TranslatePipe } from '@ngx-translate/core';
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
import { UserSettingService } from '../../core/services/user-setting.service';

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
    DropdownComponent,
    FormsModule,
  ],
  templateUrl: './authenticated-layout.component.html',
  styleUrl: './authenticated-layout.component.scss',
})
export class AuthenticatedLayoutComponent implements OnDestroy, OnInit {
  isSidebarOpen = signal<boolean>(false);
  private router = inject(Router);
  public secretKeyService = inject(SecretKeyService);
  private toastService = inject(ToastService);

  private themeService = inject(ThemeService);
  private langService = inject(LanguageService);
  private timeframeService = inject(TimeframeService);
  public accountService = inject(AccountService);
  public authService = inject(BackendApiService);

  private userDataWsService = inject(UserDataWsService);

  public layoutService = inject(LayoutService);

  masterTokenInput = '';
  isVerifyingToken = false;
  isHeaderVisible = signal<boolean>(true);
  currentTime = signal<string>('00:00');

  private clockSubscription = new Subscription();

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

  userSettingService = inject(UserSettingService);

  constructor() {
    this.userDataWsService.temp();
    effect(() => {
      const settings = this.userSettingService.settings();
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

  ngOnInit(): void {
    this.startClock();
  }

  private startClock() {
    this.clockSubscription.add(
      interval(1000).subscribe({
        next: () => {
          const now = new Date();
          const m = now.getMinutes().toString().padStart(2, '0');
          const s = now.getSeconds().toString().padStart(2, '0');
          this.currentTime.set(`${m}:${s}`);
        },
      }),
    );
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

  ngOnDestroy(): void {
    this.clockSubscription.unsubscribe();
  }
}
