import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateDirective } from '@ngx-translate/core';
import { BackendApiService } from '../../core/services/api/backend-api.service';
import { SuggestionPositionModal } from './suggestion-position/suggestion-position.modal';
import {
  injectQuery,
  injectMutation,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { effect } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ModalService } from '../../core/services/modal.service';
import { BaseLayoutComponent } from '../../shared/classes/base-layout';
import {
  TokenCardComponent,
  AiCheckState,
} from '../../shared/components/token-card/token-card.component';

@Component({
  selector: 'app-suggestion-page',
  standalone: true,
  imports: [CommonModule, TranslateDirective, TokenCardComponent],
  templateUrl: './suggestion.component.html',
  styleUrl: './suggestion.component.scss',
})
export class SuggestionPageComponent extends BaseLayoutComponent {
  private backendApi = inject(BackendApiService);
  private queryClient = inject(QueryClient);
  private modalService = inject(ModalService);

  limit = signal<number>(10);

  settingsQuery = injectQuery(() => ({
    queryKey: ['settings'],
    queryFn: () => lastValueFrom(this.backendApi.getSettings()),
    staleTime: Infinity,
  }));

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
          if (this.limit() !== settings.suggestionLimit) {
            this.limit.set(settings.suggestionLimit);
          }
        }
      },
      { allowSignalWrites: true },
    );
  }

  suggestionsQuery = injectQuery(() => ({
    queryKey: ['suggestions', 'futures', this.limit()],
    queryFn: () =>
      lastValueFrom(this.backendApi.getFuturesSuggestions(this.limit())),
  }));

  onRefresh() {
    this.suggestionsQuery.refetch();
  }

  onLimitChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.limit.set(Number(value));
    this.updateSettingsMutation.mutate(Number(value));
  }

  aiChecks = signal<Record<string, AiCheckState>>({});

  async onAiCheck(symbol: string) {
    this.aiChecks.update((state) => ({
      ...state,
      [symbol]: { ...state[symbol], loading: true, error: false },
    }));

    try {
      const timeFrame = this.settingsQuery.data()?.timeFrame;
      const data = await lastValueFrom(
        this.backendApi.getAiCheck(symbol, timeFrame),
      );
      this.aiChecks.update((state) => ({
        ...state,
        [symbol]: { loading: false, data, error: false },
      }));
    } catch {
      this.aiChecks.update((state) => ({
        ...state,
        [symbol]: { loading: false, error: true },
      }));
    }
  }

  openPositionModal(symbol: string) {
    this.modalService.open(SuggestionPositionModal, { symbol });
  }
}
