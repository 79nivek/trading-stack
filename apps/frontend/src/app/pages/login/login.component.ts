import { injectMutation } from "@tanstack/angular-query-experimental";
import { lastValueFrom } from "rxjs";
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BackendApiService } from '../../core/services/backend-api.service';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PopupService } from '../../core/services/popup.service';
import { APP_PATHS } from '../../core/constants/routes.constants';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe,
    TranslateDirective,
    ButtonComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(BackendApiService);
  private router = inject(Router);
  private popupService = inject(PopupService);

  APP_PATHS = APP_PATHS;

  loginForm = this.fb.group({
    email: ['', [Validators.required]],
    password: ['', Validators.required],
  });


  loginMutation = injectMutation(() => ({
    mutationFn: (credentials: any) => lastValueFrom(this.authService.login(credentials)),
    onSuccess: () => {
      this.router.navigate([APP_PATHS.DASHBOARD]);
    },
    onError: (err: any) => {
      this.popupService.open({
        title: 'Login Failed',
        message: err.error?.message || 'Invalid credentials.',
        buttons: [
          {
            text: 'Close',
            type: 'danger',
            action: () => {
              this.popupService.close();
            },
          },
        ],
      });
    }
  }));

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loginMutation.mutate(this.loginForm.value);
  }
}
