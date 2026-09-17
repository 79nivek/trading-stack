import { Component, signal, inject, OnInit } from '@angular/core';
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
import { BackendApiService } from '../../core/services/backend-api.service';
import { APP_PATHS } from '../../core/constants/routes.constants';
import { SecretKeyService } from '../../core/services/secret-key.service';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService, Theme } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { TimeframeService, Timeframe } from '../../core/services/timeframe.service';
import { FormsModule } from '@angular/forms';

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
    FormsModule
  ],
  templateUrl: './authenticated-layout.component.html',
  styleUrl: './authenticated-layout.component.scss',
})
export class AuthenticatedLayoutComponent implements OnInit {
  isSidebarOpen = signal<boolean>(true);
  private router = inject(Router);
  public secretKeyService = inject(SecretKeyService);
  private toastService = inject(ToastService);
  
  private themeService = inject(ThemeService);
  private langService = inject(LanguageService);
  private timeframeService = inject(TimeframeService);

  masterTokenInput = '';
  isVerifyingToken = false;

  menuItems = [
    { path: APP_PATHS.DASHBOARD, label: 'MENU.DASHBOARD', icon: 'D' },
    { path: APP_PATHS.CURRENTLY_TRADING, label: 'MENU.CURRENTLY_TRADING', icon: 'C' },
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

  constructor(public authService: BackendApiService) {}

  ngOnInit() {
    this.authService.getSettings().subscribe({
      next: (settings) => {
        if (settings) {
          if (settings.theme) this.themeService.setTheme(settings.theme as Theme, false);
          if (settings.language) this.langService.setLanguage(settings.language, false);
          if (settings.timeFrame) this.timeframeService.setTimeframe(settings.timeFrame as Timeframe, false);
        }
      },
      error: (err) => {
        console.error('Failed to load user settings', err);
      }
    });
  }

  toggleSidebar() {
    this.isSidebarOpen.update((v) => !v);
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
      this.isVerifyingToken = true;
      this.authService.checkMasterToken(token).subscribe({
        next: (res) => {
          this.isVerifyingToken = false;
          if (res.ok) {
            this.secretKeyService.setToken(token);
            this.masterTokenInput = '';
            this.toastService.show('Token activated successfully', 'success');
          } else {
            this.toastService.show('Failed to verify token', 'danger');
          }
        },
        error: (err) => {
          this.isVerifyingToken = false;
          this.toastService.show(err.error?.message || 'Invalid Master Token', 'danger');
        }
      });
    }
  }
}
