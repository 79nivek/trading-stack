import { Component, inject, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalService } from '../../../core/services/modal.service';
import { BackendApiService } from '../../../core/services/api/backend-api.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';

@Component({
  selector: 'app-ui-setting-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    TranslatePipe,
    TranslateDirective,
  ],
  templateUrl: './ui-setting-modal.component.html',
})
export class UiSettingModalComponent {
  private fb = inject(FormBuilder);
  modalService = inject(ModalService);
  private api = inject(BackendApiService);
  private toast = inject(ToastService);

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
  });

  settingsQuery = injectQuery(() => ({
    queryKey: ['settings'],
    queryFn: () => lastValueFrom(this.api.getSettings()),
  }));

  saveMutation = injectMutation(() => ({
    mutationFn: (config: any) => lastValueFrom(this.api.updateSettings(config)),
    onSuccess: () => {
      this.toast.show('UI settings saved successfully!', 'success');
      this.modalService.close();
      // Optional: invalidate queries if needed
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
      const data = this.settingsQuery.data();
      if (data && data.timeZone) {
        this.form.patchValue({ timeZone: data.timeZone });
      }
    });
  }

  onSave() {
    this.saveMutation.mutate(this.form.value);
  }
}
