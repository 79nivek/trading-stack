import { Component, inject, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CheckboxComponent } from '../../../shared/components/checkbox/checkbox.component';
import { ModalService } from '../../../core/services/modal.service';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';
import {
  injectSettingQuery,
  injectSettingsMutation,
} from '../../../core/queries/user-setting.query';

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

  saveMutation = injectSettingsMutation();

  settings = injectSettingQuery();

  constructor() {
    effect(() => {
      const data = this.settings.data();
      if (data) {
        this.form.patchValue({
          timeZone: data.timeZone || 'UTC',
          showFloatingClock: data.showFloatingClock !== false,
        });
      }
    });
  }

  onSave() {
    const { timeZone, showFloatingClock } = this.form.value;
    if (!timeZone || showFloatingClock === null) return;

    this.saveMutation.mutate({ timeZone, showFloatingClock });
  }
}
