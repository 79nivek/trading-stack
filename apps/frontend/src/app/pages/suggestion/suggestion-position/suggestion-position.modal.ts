import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectSuggestionPositionMutation } from '../../../core/queries/suggestion.query';
import { injectPlaceFuturesPositionMutation } from '../../../core/queries/position.query';
import {
  SuggestionPositionResponseDto,
  PositionSetupDto,
} from '@trading-stack/shared-dto';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TranslatePipe } from '@ngx-translate/core';
import { masterTokenStorageInstance } from '../../../core/services/storage.service';

export type SuggestionPositionModalInput = {
  symbol: string;
};

@Component({
  selector: 'app-suggestion-position-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, TranslatePipe],
  templateUrl: './suggestion-position.modal.html',
  styleUrl: './suggestion-position.modal.scss',
})
export class SuggestionPositionModal {
  @Input() dataInput: SuggestionPositionModalInput | null = null;
  @Output() close = new EventEmitter<void>();

  suggestionPositionMutation = injectSuggestionPositionMutation();
  placePositionMutation = injectPlaceFuturesPositionMutation();

  balance = signal<number | null>(null);

  loadingSuggestion = signal<boolean>(false);
  suggestionResult = signal<SuggestionPositionResponseDto | null>(null);

  errorMsg = signal<string | null>(null);

  get hasMasterToken(): boolean {
    return !!masterTokenStorageInstance.get();
  }

  onSubmit() {
    if (!this.dataInput?.symbol) {
      this.errorMsg.set('Symbol is required.');
      return;
    }
    this.errorMsg.set(null);
    this.loadingSuggestion.set(true);
    this.suggestionResult.set(null);

    this.suggestionPositionMutation.mutate(
      { symbol: this.dataInput.symbol, balance: this.balance() },
      {
        onSuccess: (res) => {
          this.suggestionResult.set(res);
          this.loadingSuggestion.set(false);
        },
        onError: (err: any) => {
          this.errorMsg.set(err.error?.message || 'Error getting suggestions.');
          this.loadingSuggestion.set(false);
        },
      },
    );
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

    this.placePositionMutation.mutate(payload, {
      onSuccess: (res: any) => {
        if (res.ok) {
          this.placeSuccess.set(
            `Successfully placed ${setup.direction} order via ${setup.strategyName}!`,
          );
        } else {
          this.errorMsg.set(res.message || 'Failed to place order.');
        }
        this.placingSetup.set(null);
      },
      onError: (err: any) => {
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
