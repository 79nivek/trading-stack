import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PopupService } from '../../core/services/popup.service';
import { BackendApiService } from '../../core/services/backend-api.service';
import { REGEX } from '../../core/constants/regex.constants';
import { ERROR_MESSAGES } from '../../core/constants/error.constants';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';
import { SignUpDto } from '@trading-stack/shared-dto';
import { APP_PATHS } from '../../core/constants/routes.constants';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    TranslatePipe,
    TranslateDirective,
  ],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss',
})
export class SignUpPageComponent {
  private fb = inject(FormBuilder);
  private backendApi = inject(BackendApiService);
  private router = inject(Router);
  private popupService = inject(PopupService);

  ERRORS = ERROR_MESSAGES;
  APP_PATHS = APP_PATHS;

  signUpForm = this.fb.group({
    username: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.pattern(REGEX.EMAIL)]],
    password: [
      '',
      [Validators.required, Validators.pattern(REGEX.STRONG_PASSWORD)],
    ],
  });

  get f() {
    return this.signUpForm.controls;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.signUpForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit() {
    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }

    this.backendApi.signUp(this.signUpForm.value as SignUpDto).subscribe({
      next: () => {
        this.popupService.open({
          title: 'SIGNUP.SUCCESS_TITLE',
          message: 'SIGNUP.SUCCESS_MSG',
          buttons: [
            {
              text: 'SIGNUP.GO_TO_LOGIN',
              type: 'primary',
              action: () => this.router.navigate([APP_PATHS.LOGIN]),
            },
          ],
        });
      },
      error: (err) => {
        this.popupService.open({
          title: 'SIGNUP.ERROR_TITLE',
          message: err.error?.message || 'Registration failed.',
          buttons: [
            {
              text: 'SIGNUP.CLOSE',
              type: 'danger',
              action: () => {},
            },
            {
              text: 'SIGNUP.GO_TO_LOGIN',
              type: 'primary',
              action: () => this.router.navigate([APP_PATHS.LOGIN]),
            },
          ],
        });
      },
    });
  }
}
