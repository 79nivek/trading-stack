import {
  Component,
  inject,
  signal,
  OnDestroy,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateDirective } from '@ngx-translate/core';
import { ModalService } from '../../core/services/modal.service';
import { ToastService } from '../../core/services/toast.service';
import { BaseLayoutComponent } from '../../shared/classes/base-layout';
import { TokenCardComponent } from '../../shared/components/token-card/token-card.component';
import { SuggestionPositionModal } from '../suggestion/suggestion-position/suggestion-position.modal';
import { TokenSuggestionDto } from '@trading-stack/shared-dto';
import { AutoCompleteComponent } from '../../shared/components/auto-complete/auto-complete.component';
import { NoDataComponent } from '../../shared/components/no-data/no-data.component';
import { injectExchangeInfoQuery } from '../../core/queries/exchange-info.query';
import {
  injectAddFollowedMutation,
  injectFollowedQuery,
  injectRemoveFollowedMutation,
  injectReorderFollowedMutation,
} from '../../core/queries/followed-symbol.query';

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
    TokenCardComponent,
    AutoCompleteComponent,
    NoDataComponent,
  ],
  templateUrl: './followed.component.html',
  styleUrl: './followed.component.scss',
})
export class FollowedPageComponent
  extends BaseLayoutComponent
  implements OnDestroy
{
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);
  exchangeInfo = injectExchangeInfoQuery();
  // ─── Search / Autocomplete ─────────────────────────────────────────────────

  allBinanceSymbols = computed(() => {
    if (this.exchangeInfo.isLoading()) return [];
    const res: string[] = [];
    this.exchangeInfo.data()?.forEach((value, key) => {
      if (
        key.endsWith('USDT') &&
        value.contractType === 'PERPETUAL' &&
        value.status === 'TRADING'
      ) {
        res.push(key);
      }
    });
    return res;
  });

  // ─── Drag-and-drop state ───────────────────────────────────────────────────

  /** Local ordered list of entries — updated optimistically on drop */
  orderedEntries = signal<FollowedTokenEntry[]>([]);

  dragEnabledIndex = signal<number | null>(null);
  private dragSourceIndex: number | null = null;
  private dragOverIndex: number | null = null;

  constructor() {
    super();
    effect(() => {
      const followed = this.followedQuery.data();
      console.log('followed', followed);
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  onSymbolSelected(item: any): void {
    this.selectSymbol(item.value);
  }

  // ─── Queries / Mutations ──────────────────────────────────────────────────

  followedQuery = injectFollowedQuery();

  addMutation = injectAddFollowedMutation();

  removeMutation = injectRemoveFollowedMutation();

  reorderMutation = injectReorderFollowedMutation();

  // ─── Actions ──────────────────────────────────────────────────────────────

  selectSymbol(symbol: string): void {
    const alreadyFollowed = this.followedQuery
      .data()
      ?.some((f) => f.symbol === symbol);

    if (alreadyFollowed) {
      this.toastService.show(`${symbol} is already in your list.`, 'danger');
    } else {
      this.addMutation.mutate({ symbol });
    }
  }

  onRemove(id: string): void {
    this.removeMutation.mutate(id);
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
    this.reorderMutation.mutate({ orderedIds });

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

  openPositionModal(symbol: string): void {
    this.modalService.open(SuggestionPositionModal, { symbol });
  }
}
