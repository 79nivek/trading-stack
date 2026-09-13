import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';

import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ModalService } from '../../core/services/modal.service';
import { ToastService } from '../../core/services/toast.service';
import { BackendApiService } from '../../core/services/backend-api.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ResetPasswordDto } from '@trading-stack/shared-dto';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, TranslateDirective, ModalComponent, ButtonComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private backendApi = inject(BackendApiService);
  private toast = inject(ToastService);
  modalService = inject(ModalService);

  isSubmitting = false;

  form: FormGroup = this.fb.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const dto: ResetPasswordDto = {
      oldPassword: this.form.value.oldPassword,
      newPassword: this.form.value.newPassword
    };

    this.backendApi.resetPassword(dto).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.show('Password reset successful', 'success');
        this.modalService.close();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.show(err.error?.message || 'Password reset failed', 'danger');
      }
    });
  }
}
