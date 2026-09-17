import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';

import { BackendApiService } from '../../../core/services/backend-api.service';
import { ModalService } from '../../../core/services/modal.service';
import { ToastService } from '../../../core/services/toast.service';
import { ResetPasswordComponent } from '../../reset-password/reset-password.component';
import { UpdateUserDto } from '@trading-stack/shared-dto';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TranslateDirective,
    ButtonComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfilePageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private backendApi = inject(BackendApiService);
  private toast = inject(ToastService);
  private modal = inject(ModalService);


  updateProfileMutation = injectMutation(() => ({
    mutationFn: (dto: UpdateUserDto) => lastValueFrom(this.backendApi.updateProfile(dto)),
    onSuccess: () => {
      this.toast.show('Profile updated successfully', 'success');
      this.form.markAsPristine();
      // Refresh user info
      this.backendApi.getMe().subscribe();
    },
    onError: (err: any) => {
      this.toast.show(err.error?.message || 'Update failed', 'danger');
    }
  }));

  form: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    username: ['', [Validators.required]],
    email: [{ value: '', disabled: true }],
  });

  ngOnInit() {
    const user = this.backendApi.currentUser();
    if (user) {
      this.form.patchValue({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
      });
    }
  }

  openResetPassword() {
    this.modal.open(ResetPasswordComponent);
  }

  submit() {
    if (this.form.invalid || this.form.pristine) return;

    // Get dirty fields only
    const dirtyValues: any = {};
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.controls[key];
      if (control.dirty) {
        dirtyValues[key] = control.value;
      }
    });

    const dto: UpdateUserDto = dirtyValues;
    this.updateProfileMutation.mutate(dto);
  }
}
