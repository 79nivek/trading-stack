import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateDirective } from '@ngx-translate/core';
import { BackendApiService } from '../../core/services/api/backend-api.service';
import { ChartComponent } from '../../shared/components/chart/chart.component';
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

@Component({
  selector: 'app-suggestion-page',
  standalone: true,
  imports: [CommonModule, TranslateDirective, ChartComponent],
  templateUrl: './suggestion.component.html',
  styleUrl: './suggestion.component.scss',
})
export class SuggestionPageComponent
  extends BaseLayoutComponent
  implements OnInit
{
  private backendApi = inject(BackendApiService);
  private queryClient = inject(QueryClient);
  private modalService = inject(ModalService);

  /** Set chứa symbol đang được expand (mở chi tiết). Mặc định rỗng = tất cả collapsed. */
  expandedCards = signal<Set<string>>(new Set());

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

  ngOnInit(): void {
    effect(
      () => {
        const settings = this.settingsQuery.data();
        if (settings?.suggestionLimit) {
          // Prevent unnecessary updates if it's already the same
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

  aiChecks = signal<
    Record<string, { loading: boolean; data?: any; error?: boolean }>
  >({});

  async onAiCheck(symbol: string) {
    // Set loading
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
    } catch (err) {
      this.aiChecks.update((state) => ({
        ...state,
        [symbol]: { loading: false, error: true },
      }));
    }
  }

  showPositionModal = signal<boolean>(false);
  selectedPositionSymbol = signal<string>('');

  openPositionModal(symbol: string) {
    this.modalService.open(SuggestionPositionModal, {
      symbol,
    });
  }

  isCollapsed(symbol: string): boolean {
    return !this.expandedCards().has(symbol);
  }

  toggleCollapse(symbol: string): void {
    this.expandedCards.update((set) => {
      const next = new Set(set);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  }
}
