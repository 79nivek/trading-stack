import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import {
  injectQuery,
  injectMutation,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';

import { BackendApiService } from '../../core/services/api/backend-api.service';
import { BinanceFuturesApiService } from '../../core/services/api/binance-futures-api.service';
import { ModalService } from '../../core/services/modal.service';
import { ToastService } from '../../core/services/toast.service';
import { BaseLayoutComponent } from '../../shared/classes/base-layout';
import {
  TokenCardComponent,
  AiCheckState,
} from '../../shared/components/token-card/token-card.component';
import { SuggestionPositionModal } from '../suggestion/suggestion-position/suggestion-position.modal';
import {
  TokenSuggestionDto,
  FollowedSymbolDto,
} from '@trading-stack/shared-dto';
import { AutoCompleteComponent } from '../../shared/components/auto-complete/auto-complete.component';

/** Pairs token market data with its followed-symbol record for rendering */
export interface FollowedTokenEntry {
  followedId: string;
  token: TokenSuggestionDto;
}

@Component({
  selector: 'app-followed-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateDirective,
    TranslatePipe,
    TokenCardComponent,
    AutoCompleteComponent,
  ],
  templateUrl: './followed.component.html',
  styleUrl: './followed.component.scss',
})
export class FollowedPageComponent
  extends BaseLayoutComponent
  implements OnInit, OnDestroy
{
  private backendApi = inject(BackendApiService);
  private binanceApi = inject(BinanceFuturesApiService);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);
  private queryClient = inject(QueryClient);
  // ─── Search / Autocomplete ─────────────────────────────────────────────────

  allBinanceSymbols = signal<string[]>([]);
  symbolsLoaded = signal<boolean>(false);

  // ─── Drag-and-drop state ───────────────────────────────────────────────────

  /** Local ordered list of entries — updated optimistically on drop */
  orderedEntries = signal<FollowedTokenEntry[]>([]);

  dragEnabledIndex = signal<number | null>(null);
  private dragSourceIndex: number | null = null;
  private dragOverIndex: number | null = null;

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.binanceApi.getFuturesSymbolList().subscribe({
      next: (symbols) => {
        this.allBinanceSymbols.set(symbols);
        this.symbolsLoaded.set(true);
      },
      error: () => this.symbolsLoaded.set(true),
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  onSymbolSelected(item: any): void {
    this.selectSymbol(item.value);
  }

  // ─── Build ordered entries when query data arrives ─────────────────────────

  private buildOrderedEntries(
    followedList: FollowedSymbolDto[],
    tokenData: TokenSuggestionDto[],
  ): FollowedTokenEntry[] {
    return followedList
      .filter((f) => tokenData.some((t) => t.symbol === f.symbol))
      .map((f) => ({
        followedId: f.id,
        token: tokenData.find((t) => t.symbol === f.symbol)!,
      }));
  }

  // ─── Queries / Mutations ──────────────────────────────────────────────────

  followedQuery = injectQuery(() => ({
    queryKey: ['followed-symbols'],
    queryFn: () => lastValueFrom(this.backendApi.getFollowedSymbols()),
  }));

  followedDataQuery = injectQuery(() => ({
    queryKey: ['followed-symbols', 'data'],
    queryFn: async () => {
      const data = await lastValueFrom(
        this.backendApi.getFollowedSymbolsData(),
      );
      // Sync orderedEntries whenever fresh data arrives
      const followed = this.followedQuery.data() ?? [];
      this.orderedEntries.set(this.buildOrderedEntries(followed, data));
      return data;
    },
    enabled: (this.followedQuery.data()?.length ?? 0) > 0,
  }));

  addMutation = injectMutation(() => ({
    mutationFn: (symbol: string) =>
      lastValueFrom(this.backendApi.addFollowedSymbol({ symbol })),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['followed-symbols'] });
    },
    onError: (err: any) => {
      this.toastService.show(
        err.error?.message || 'Failed to add symbol.',
        'danger',
      );
    },
  }));

  removeMutation = injectMutation(() => ({
    mutationFn: (id: string) =>
      lastValueFrom(this.backendApi.removeFollowedSymbol(id)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['followed-symbols'] });
    },
    onError: (err: any) => {
      this.toastService.show(
        err.error?.message || 'Failed to remove symbol.',
        'danger',
      );
    },
  }));

  reorderMutation = injectMutation(() => ({
    mutationFn: (orderedIds: string[]) =>
      lastValueFrom(this.backendApi.reorderFollowedSymbols({ orderedIds })),
    onError: () => {
      // On failure, restore from server by re-fetching
      this.queryClient.invalidateQueries({ queryKey: ['followed-symbols'] });
      this.toastService.show('Failed to save order.', 'danger');
    },
  }));

  // ─── Actions ──────────────────────────────────────────────────────────────

  selectSymbol(symbol: string): void {
    const alreadyFollowed = this.followedQuery
      .data()
      ?.some((f) => f.symbol === symbol);

    if (alreadyFollowed) {
      this.toastService.show(`${symbol} is already in your list.`, 'danger');
    } else {
      this.addMutation.mutate(symbol);
    }
  }

  onRemove(id: string): void {
    this.removeMutation.mutate(id);
  }

  onRefreshData(): void {
    this.queryClient.invalidateQueries({ queryKey: ['followed-symbols'] });
  }

  // ─── Drag-and-Drop (native HTML5) ─────────────────────────────────────────

  onDragStart(event: DragEvent, index: number): void {
    this.dragSourceIndex = index;
    event.dataTransfer?.setData('text/plain', String(index));
    // Small delay so the ghost image captures the card before .dragging class applies
    requestAnimationFrame(() => {
      const el = (event.target as HTMLElement).closest(
        '.followed-card-wrapper',
      );
      el?.classList.add('dragging');
    });
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault(); // Required to allow drop
    if (this.dragOverIndex !== index) {
      this.dragOverIndex = index;
    }
  }

  onDragLeave(_event: DragEvent, index: number): void {
    if (this.dragOverIndex === index) {
      this.dragOverIndex = null;
    }
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    const sourceIndex = this.dragSourceIndex;
    if (sourceIndex === null || sourceIndex === dropIndex) {
      this.resetDragState();
      return;
    }

    // Optimistic reorder
    const current = [...this.orderedEntries()];
    const [moved] = current.splice(sourceIndex, 1);
    current.splice(dropIndex, 0, moved);
    this.orderedEntries.set(current);

    // Persist to backend
    const orderedIds = current.map((e) => e.followedId);
    this.reorderMutation.mutate(orderedIds);

    this.resetDragState();
  }

  onDragEnd(event: DragEvent): void {
    const el = (event.target as HTMLElement).closest('.followed-card-wrapper');
    el?.classList.remove('dragging');
    this.resetDragState();
  }

  isDragOver(index: number): boolean {
    return this.dragOverIndex === index;
  }

  onDragHover(isHovering: boolean, index: number): void {
    if (this.dragSourceIndex !== null) return; // Prevent changing draggable state while active drag

    if (isHovering) {
      this.dragEnabledIndex.set(index);
    } else if (this.dragEnabledIndex() === index) {
      this.dragEnabledIndex.set(null);
    }
  }

  private resetDragState(): void {
    this.dragSourceIndex = null;
    this.dragOverIndex = null;
    this.dragEnabledIndex.set(null);
  }

  // ─── AI Check ─────────────────────────────────────────────────────────────

  settingsQuery = injectQuery(() => ({
    queryKey: ['settings'],
    queryFn: () => lastValueFrom(this.backendApi.getSettings()),
    staleTime: Infinity,
  }));

  aiChecks = signal<Record<string, AiCheckState>>({});

  async onAiCheck(symbol: string): Promise<void> {
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

  openPositionModal(symbol: string): void {
    this.modalService.open(SuggestionPositionModal, { symbol });
  }
}
