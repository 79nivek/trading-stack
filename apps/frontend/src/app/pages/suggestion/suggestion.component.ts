import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateDirective } from '@ngx-translate/core';
import { BackendApiService } from '../../core/services/api/backend-api.service';
import { SuggestionPositionModal } from './suggestion-position/suggestion-position.modal';
import {
  injectQuery,
  injectMutation,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ModalService } from '../../core/services/modal.service';
import { BaseLayoutComponent } from '../../shared/classes/base-layout';
import {
  TokenCardComponent,
} from '../../shared/components/token-card/token-card.component';
import { NoDataComponent } from '../../shared/components/no-data/no-data.component';

@Component({
  selector: 'app-suggestion-page',
  standalone: true,
  imports: [CommonModule, TranslateDirective, TokenCardComponent, NoDataComponent],
  templateUrl: './suggestion.component.html',
  styleUrl: './suggestion.component.scss',
})
export class SuggestionPageComponent extends BaseLayoutComponent {
  private backendApi = inject(BackendApiService);
  private queryClient = inject(QueryClient);
  private modalService = inject(ModalService);

  userLimit = signal<number | undefined>(undefined);

  settingsQuery = injectQuery(() => ({
    queryKey: ['settings'],
    queryFn: () => lastValueFrom(this.backendApi.getSettings()),
    staleTime: Infinity,
  }));

  limit = computed(() => {
    if (this.userLimit() !== undefined) {
      return this.userLimit()!;
    }
    const settings = this.settingsQuery.data();
    if (!this.settingsQuery.isPending()) {
      return settings?.suggestionLimit || 10;
    }
    return undefined;
  });

  updateSettingsMutation = injectMutation(() => ({
    mutationFn: (limit: number) =>
      lastValueFrom(this.backendApi.updateSettings({ suggestionLimit: limit })),
    onSuccess: () =>
      this.queryClient.invalidateQueries({ queryKey: ['settings'] }),
  }));

  constructor() {
    super();
    effect(
      () => {
        const settings = this.settingsQuery.data();
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
