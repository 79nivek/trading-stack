import { Component, inject, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CheckboxComponent } from '../../../shared/components/checkbox/checkbox.component';
import { ModalService } from '../../../core/services/modal.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  injectMutation,

} from '@tanstack/angular-query-experimental';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';
import { UserSettingService } from '../../../core/services/user-setting.service';

@Component({
  selector: 'app-ui-setting-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    CheckboxComponent,
    TranslatePipe,
    TranslateDirective,
  ],
  templateUrl: './ui-setting-modal.component.html',
})
export class UiSettingModalComponent {
  private fb = inject(FormBuilder);
  modalService = inject(ModalService);
  private toast = inject(ToastService);

  private userSettingService = inject(UserSettingService);

  timezones = [
    'UTC-12',
    'UTC-11',
    'UTC-10',
    'UTC-9',
    'UTC-8',
    'UTC-7',
    'UTC-6',
    'UTC-5',
    'UTC-4',
    'UTC-3',
    'UTC-2',
    'UTC-1',
    'UTC',
    'UTC+1',
    'UTC+2',
    'UTC+3',
    'UTC+4',
    'UTC+5',
    'UTC+6',
    'UTC+7',
    'UTC+8',
    'UTC+9',
    'UTC+10',
    'UTC+11',
    'UTC+12',
  ];

  form = this.fb.group({
    timeZone: ['UTC'],
    showFloatingClock: [true],
  });

  saveMutation = injectMutation(() => ({
    mutationFn: (config: any) => this.userSettingService.updateSettings(config),
    onSuccess: () => {
      this.toast.show('UI settings saved successfully!', 'success');
      this.modalService.close();
    },
    onError: (err: any) => {
      this.toast.show(
        err.error?.message || 'Failed to save UI settings.',
        'danger',
      );
    },
  }));

  constructor() {
    effect(() => {
      const data = this.userSettingService.settings();
      if (data) {
        this.form.patchValue({ 
          timeZone: data.timeZone || 'UTC',
          showFloatingClock: data.showFloatingClock !== false,
        });
      }
    });
  }

  onSave() {
    this.saveMutation.mutate(this.form.value);
  }
}
