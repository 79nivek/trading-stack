import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateDirective } from '@ngx-translate/core';
import { BackendApiService } from '../../core/services/api/backend-api.service';
import { UserSettingService } from '../../core/services/user-setting.service';
import { SuggestionPositionModal } from './suggestion-position/suggestion-position.modal';
import {
  injectQuery,
  injectMutation,
} from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ModalService } from '../../core/services/modal.service';
import { BaseLayoutComponent } from '../../shared/classes/base-layout';
import { TokenCardComponent } from '../../shared/components/token-card/token-card.component';
import { NoDataComponent } from '../../shared/components/no-data/no-data.component';

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
  private backendApi = inject(BackendApiService);
  private userSettingService = inject(UserSettingService);
  private modalService = inject(ModalService);

  userLimit = signal<number | undefined>(undefined);

  limit = computed(() => {
    if (this.userLimit() !== undefined) {
      return this.userLimit()!;
    }
    const settings = this.userSettingService.settings();
    if (settings) {
      return settings?.suggestionLimit || 10;
    }
    return undefined;
  });

  updateSettingsMutation = injectMutation(() => ({
    mutationFn: (limit: number) =>
      this.userSettingService.updateSettings({ suggestionLimit: limit }),
  }));

  constructor() {
    super();
    effect(
      () => {
        const settings = this.userSettingService.settings();
        if (settings?.suggestionLimit) {
          if (this.userLimit() !== settings.suggestionLimit) {
            this.userLimit.set(settings.suggestionLimit);
          }
        }
      },
      { allowSignalWrites: true },
    );
  }

  suggestionsQuery = injectQuery(() => ({
    queryKey: ['suggestions', 'futures', this.limit()],
    queryFn: () =>
      lastValueFrom(this.backendApi.getFuturesSuggestions(this.limit()!)),
    enabled: this.limit() !== undefined,
  }));

  onRefresh() {
    this.suggestionsQuery.refetch();
  }

  onLimitChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.userLimit.set(Number(value));
    this.updateSettingsMutation.mutate(Number(value));
  }

  openPositionModal(symbol: string) {
    this.modalService.open(SuggestionPositionModal, { symbol });
  }
}
