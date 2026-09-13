import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../shared/components/lang-toggle/lang-toggle.component';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';
import {
  DropdownComponent,
  DropdownItem,
} from '../../shared/components/dropdown/dropdown.component';
import { BackendApiService } from '../../core/services/backend-api.service';
import { APP_PATHS } from '../../core/constants/routes.constants';

@Component({
  selector: 'app-authenticated-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleComponent,
    LangToggleComponent,
    TranslatePipe,
    TranslateDirective,
    DropdownComponent,
  ],
  templateUrl: './authenticated-layout.component.html',
  styleUrl: './authenticated-layout.component.scss',
})
export class AuthenticatedLayoutComponent {
  isSidebarOpen = signal<boolean>(true);
  private router = inject(Router);

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
    { label: '', action: 'divider', divider: true },
    { label: 'HEADER_PROFILE.LOGOUT', action: 'logout' },
  ];

  constructor(public authService: BackendApiService) {}

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
}
