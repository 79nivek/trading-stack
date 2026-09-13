import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { LanguageService } from './core/services/language.service';

import { SpinnerComponent } from './shared/components/spinner/spinner.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { PopupComponent } from './shared/components/popup/popup.component';
import { ModalHostComponent } from './shared/components/modal-host/modal-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SpinnerComponent, ToastComponent, PopupComponent, ModalHostComponent],
  template: `
    <router-outlet></router-outlet>
    <app-spinner></app-spinner>
    <app-toast></app-toast>
    <app-popup></app-popup>
    <app-modal-host></app-modal-host>
  `,
})
export class AppComponent implements OnInit {
  // Injecting them here ensures they instantiate on app load and subscribe to effects
  themeService = inject(ThemeService);
  langService = inject(LanguageService);

  ngOnInit() {}
}
