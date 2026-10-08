import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateDirective } from '@ngx-translate/core';
import { injectSuggestionsQuery } from '../../core/queries/suggestion.query';
import { SuggestionPositionModal } from './suggestion-position/suggestion-position.modal';
import { ModalService } from '../../core/services/modal.service';
import { BaseLayoutComponent } from '../../shared/classes/base-layout';
import { TokenCardComponent } from '../../shared/components/token-card/token-card.component';
import { NoDataComponent } from '../../shared/components/no-data/no-data.component';
import {
  injectSettingQuery,
  injectSettingsMutation,
} from '../../core/queries/user-setting.query';

@Component({
  selector: 'app-suggestion-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateDirective,
    TokenCardComponent,
    NoDataComponent,
  ],
  templateUrl: './suggestion.component.html',
  styleUrl: './suggestion.component.scss',
})
export class SuggestionPageComponent extends BaseLayoutComponent {
  private modalService = inject(ModalService);

  private userSettings = injectSettingQuery();
  userLimit = signal<number | undefined>(undefined);

  limit = computed(() => {
    if (this.userLimit() !== undefined) {
      return this.userLimit()!;
    }
    const settings = this.userSettings.data();
    if (settings) {
      return settings?.suggestionLimit || 10;
    }
    return undefined;
  });

  updateSettingsMutation = injectSettingsMutation();

  constructor() {
    super();
    effect(
      () => {
        const settings = this.userSettings.data();
        if (settings?.suggestionLimit) {
          if (this.userLimit() !== settings.suggestionLimit) {
            this.userLimit.set(settings.suggestionLimit);
          }
        }
      },
      { allowSignalWrites: true },
    );
  }

  suggestionsQuery = injectSuggestionsQuery(this.limit as any);

  onRefresh() {
    this.suggestionsQuery.refetch();
  }

  onLimitChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.userLimit.set(Number(value));
    this.updateSettingsMutation.mutate({ suggestionLimit: Number(value) });
  }

  openPositionModal(symbol: string) {
    this.modalService.open(SuggestionPositionModal, { symbol });
  }
}
