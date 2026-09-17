import { injectMutation } from "@tanstack/angular-query-experimental";
import { lastValueFrom } from "rxjs";
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalService } from '../../../core/services/modal.service';
import { BackendApiService } from '../../../core/services/backend-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PopupService } from '../../../core/services/popup.service';

@Component({
  selector: 'app-binance-credentials-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, ButtonComponent],
  templateUrl: './binance-credentials-modal.component.html',
  styleUrl: './binance-credentials-modal.component.scss'
})
export class BinanceCredentialsModalComponent {
  private fb = inject(FormBuilder);
  modalService = inject(ModalService);
  private api = inject(BackendApiService);
  private toast = inject(ToastService);
  private popup = inject(PopupService);

  isChecking = false;
  isSaving = false;
  permissions: { readAccount: boolean; tradeSpot: boolean; tradeFutures: boolean } | null = null;

  form = this.fb.group({
    apiKey: ['', Validators.required],
    secretKey: ['', Validators.required],
  });


  checkMutation = injectMutation(() => ({
    mutationFn: (credentials: any) => lastValueFrom(this.api.checkBinanceCredentials(credentials)),
    onSuccess: (res: any) => {
      if (res && res.permissions) {
        this.permissions = res.permissions;
      }
      this.toast.show('Credentials are valid!', 'success');
    },
    onError: (err: any) => {
      this.permissions = null;
      this.toast.show(err.error?.message || 'Invalid credentials.', 'danger');
    }
  }));

  saveMutation = injectMutation(() => ({
    mutationFn: (credentials: any) => lastValueFrom(this.api.saveBinanceCredentials(credentials)),
    onSuccess: (res: any) => {
      this.modalService.close();
        
      // Show secure token to the user
      this.popup.open({
        title: 'IMPORTANT: Master Token',
        message: `Your Binance credentials have been securely encrypted. To decrypt them and execute trades, you MUST use the following Master Token:\n\n${res.token}\n\nWARNING: This token is shown ONLY ONCE. If you lose it, your credentials cannot be recovered and you will have to set them up again. Save it securely!`,
        buttons: [
          { 
            text: 'Copy Token', 
            type: 'info', 
            action: () => {
              navigator.clipboard.writeText(res.token).then(() => {
                this.toast.show('Token copied to clipboard', 'success');
              }).catch(() => {
                this.toast.show('Failed to copy token', 'danger');
              });
            } 
          },
          { text: 'I have saved it', type: 'primary', action: () => this.popup.close() }
        ]
      });
    },
    onError: (err: any) => {
      this.toast.show(err.error?.message || 'Failed to save credentials.', 'danger');
    }
  }));

  onCheck() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    this.permissions = null; // reset before check
    this.checkMutation.mutate(this.form.value);
  }

  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    this.saveMutation.mutate(this.form.value);
  }
}
