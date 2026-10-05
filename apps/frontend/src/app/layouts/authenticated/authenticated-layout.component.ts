import { injectMutation } from '@tanstack/angular-query-experimental';
import { interval, lastValueFrom, Subscription } from 'rxjs';
import { OnDestroy, OnInit } from '@angular/core';
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
import { ToastService } from '../../core/services/toast.service';
import { FormsModule } from '@angular/forms';
import { LayoutService } from '../../core/services/layout.service';
import { AccountService } from '../../core/services/account.service';
import { UserDataWsService } from '../../core/services/api/user-data-ws.service';
import {
  injectSettingQuery,
  injectSettingsMutation,
} from '../../core/queries/user-setting.query';
import { masterTokenStorageInstance } from '../../core/services/storage.service';

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
  private toastService = inject(ToastService);

  public accountService = inject(AccountService);
  public authService = inject(BackendApiService);

  private userDataWsService = inject(UserDataWsService);

  public layoutService = inject(LayoutService);

  hasMasterToken = signal(!!masterTokenStorageInstance.get())

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
        masterTokenStorageInstance.set(token);
        this.hasMasterToken.set(true);
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

  userSettings = injectSettingQuery();
  userSettingsMutation = injectSettingsMutation();

  constructor() {
    this.userDataWsService.temp();
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

  onClearMasterToken() {
    masterTokenStorageInstance.clear();
    this.hasMasterToken.set(false);
  }

  ngOnDestroy(): void {
    this.clockSubscription.unsubscribe();
  }
}
