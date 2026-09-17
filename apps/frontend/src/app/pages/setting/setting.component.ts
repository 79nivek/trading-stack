import { Component, inject } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { APP_PATHS } from '../../core/constants/routes.constants';
import { ModalService } from '../../core/services/modal.service';
import { BinanceCredentialsModalComponent } from './binance-credentials-modal/binance-credentials-modal.component';

@Component({
  selector: 'app-setting-page',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.scss'
})
export class SettingPageComponent {
  private sanitizer = inject(DomSanitizer);
  private modalService = inject(ModalService);
  private router = inject(Router);
  
  settings: { id: string, labelKey: string, icon: SafeHtml, action: () => void }[] = [
    {
      id: 'profile',
      labelKey: 'SETTING.PROFILE',
      icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>'),
      action: () => this.router.navigate([APP_PATHS.SETTING_PROFILE])
    },
    {
      id: 'binance',
      labelKey: 'SETTING.BINANCE',
      icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" /></svg>'),
      action: () => this.modalService.open(BinanceCredentialsModalComponent)
    },
    {
      id: 'notification',
      labelKey: 'SETTING.NOTIFICATION',
      icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>'),
      action: () => this.router.navigate([APP_PATHS.SETTING_NOTIFICATION])
    }
  ];
}
