import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendApiService } from '../../../core/services/api/backend-api.service';
import { SecretKeyService } from '../../../core/services/secret-key.service';
import {
  SuggestionPositionResponseDto,
  PositionSetupDto,
} from '@trading-stack/shared-dto';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';

export type SuggestionPositionModalInput = {
  symbol: string;
};

@Component({
  selector: 'app-suggestion-position-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalComponent,
    TranslateDirective,
    TranslatePipe,
  ],
  templateUrl: './suggestion-position.modal.html',
  styleUrl: './suggestion-position.modal.scss',
})
export class SuggestionPositionModal {
  @Input() dataInput:SuggestionPositionModalInput | null = null;
  @Output() close = new EventEmitter<void>();

  private backendApi = inject(BackendApiService);
  private secretKeyService = inject(SecretKeyService);

  balance = signal<number | null>(null);

  loadingSuggestion = signal<boolean>(false);
  suggestionResult = signal<SuggestionPositionResponseDto | null>(null);

  errorMsg = signal<string | null>(null);

  get hasMasterToken(): boolean {
    return !!this.secretKeyService.hasToken
  }

  onSubmit() {
    if(!this.dataInput?.symbol){
      this.errorMsg.set('Symbol is required.');
      return;
    }
    this.errorMsg.set(null);
    this.loadingSuggestion.set(true);
    this.suggestionResult.set(null);

    this.backendApi
      .getSuggestionPosition(this.dataInput.symbol , this.balance())
      .subscribe({
        next: (res) => {
          this.suggestionResult.set(res);
          this.loadingSuggestion.set(false);
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error getting suggestions.');
          this.loadingSuggestion.set(false);
        },
      });
  }

  placingSetup = signal<string | null>(null);
  placeSuccess = signal<string | null>(null);

  placeOrder(setup?: PositionSetupDto) {
    if (!setup) {
      this.errorMsg.set('No setup available to place order.');
      return;
    }

    if (!this.dataInput?.symbol) {
      this.errorMsg.set('Symbol is required.');
      return;
    }

    this.placingSetup.set(setup.strategyName);
    this.errorMsg.set(null);
    this.placeSuccess.set(null);

    const payload = {
      symbol: this.dataInput.symbol,
      direction: setup.direction,
      leverage: setup.leverage,
      margin: setup.margin,
      volume: setup.volume,
      entryType: setup.entryType,
      entryPrice: setup.entryPrice,
      takeProfitPrice: setup.takeProfitPrice,
      stopLossPrice: setup.stopLossPrice,
    };

    this.backendApi.placeFuturesPosition(payload).subscribe({
      next: (res) => {
        if (res.ok) {
          this.placeSuccess.set(
            `Successfully placed ${setup.direction} order via ${setup.strategyName}!`,
          );
        } else {
          this.errorMsg.set(res.message || 'Failed to place order.');
        }
        this.placingSetup.set(null);
      },
      error: (err) => {
        this.errorMsg.set(
          err.error?.message || 'Error placing order on Binance.',
        );
        this.placingSetup.set(null);
      },
    });
  }

  closeModal() {
    this.suggestionResult.set(null);
    this.balance.set(null);
    this.errorMsg.set(null);
    this.close.emit();
  }
}
