import { Component, inject } from '@angular/core';

import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ModalService } from '../../core/services/modal.service';
import { ToastService } from '../../core/services/toast.service';
import { injectResetPasswordMutation } from '../../core/queries/auth.query';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ResetPasswordDto } from '@trading-stack/shared-dto';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ModalComponent,
    ButtonComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  modalService = inject(ModalService);

  isSubmitting = false;

  form: FormGroup = this.fb.group(
    {
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  resetPasswordMutation = injectResetPasswordMutation();

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto: ResetPasswordDto = {
      oldPassword: this.form.value.oldPassword,
      newPassword: this.form.value.newPassword,
    };

    this.resetPasswordMutation.mutate(dto, {
      onSuccess: () => {
        this.toast.show('Password reset successful', 'success');
        this.modalService.close();
      },
      onError: (err: any) => {
        this.toast.show(
          err.error?.message || 'Password reset failed',
          'danger',
        );
      },
    });
  }
}
