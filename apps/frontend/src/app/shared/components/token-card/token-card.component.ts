import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnChanges,
  SimpleChanges,
  inject,
  OnInit,
  effect,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { ChartComponent, LineCheckPoint } from '../chart/chart.component';
import {
  TokenSuggestionDto,
  QuantAnalyzeResponseDto,
  ChartPrimaryColor,
} from '@trading-stack/shared-dto';
import { BackendApiService } from '../../../core/services/api/backend-api.service';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { LineStyle } from 'lightweight-charts';
import { AccountService } from '../../../core/services/account.service';

@Component({
  selector: 'app-token-card',
  standalone: true,
  imports: [CommonModule, TranslateDirective, TranslatePipe, ChartComponent],
  templateUrl: './token-card.component.html',
  styleUrl: './token-card.component.scss',
})
export class TokenCardComponent implements OnChanges, OnInit {
  /** The token data to display */
  @Input({ required: true }) symbol!: string;

  @Input({ required: false }) quantData: QuantAnalyzeResponseDto | null = null;

  /** Optional rank index (1-based). If provided, shows a rank badge. */
  @Input() index?: number;

  /** Chart sync group key */
  @Input() syncGroup = 'token-card';

  /** Whether to show the Remove button in the card header */
  @Input() showRemoveButton = false;

  /**
   * When true, a drag handle icon appears at the left of the header.
   * The parent is responsible for setting draggable="true" on the wrapper
   * and handling dragstart/dragend events.
   */
  @Input() draggable = false;

  @Output() openPosition = new EventEmitter<string>();
  @Output() remove = new EventEmitter<void>();
  @Output() dragHover = new EventEmitter<boolean>();

  private backendApi = inject(BackendApiService);
  private toastService = inject(ToastService);
  private accountService = inject(AccountService);

  isCollapsed = signal<boolean>(true);
  quantInfo = signal<TokenSuggestionDto | null>(null);
  lineCheckpoint = signal<LineCheckPoint[]>([]);
  position = computed(() =>
    this.accountService.currentPositions().get(this.symbol),
  );
  isOpeningPosition = computed(() => !!this.position());

  quantDataQuery = injectQuery(() => ({
    queryKey: ['analyze', this.symbol],
    queryFn: () =>
      lastValueFrom(this.backendApi.quantAnalyzeToken(this.symbol)),
    enabled: !!this.symbol && !this.quantData,
  }));

  // private accountService = inject(AccountService);

  llmAnalyzeTokenMutation = injectMutation(() => ({
    mutationFn: () =>
      lastValueFrom(this.backendApi.llmAnalyzeToken(this.symbol)),
    onSuccess: () => {
      this.isCollapsed.set(false);
    },
    onError: (err: any) => {
      this.toastService.show(
        err.error?.message || 'Invalid Master Token',
        'danger',
      );
    },
  }));

  constructor() {
    effect(() => {
      if (this.quantDataQuery.data()) {
        this.quantInfo.set(this.quantDataQuery.data() as TokenSuggestionDto);
      }
      if (this.position()?.entryPrice) {
        this.lineCheckpoint.set([
          {
            color: ChartPrimaryColor.ENTRY,
            title: 'Entry',
            value: (this.position()?.entryPrice || 0).toString(),
            lineStyle: LineStyle.Dotted,
          },
          {
            color: ChartPrimaryColor.LIQUIDATION,
            title: 'Liquidation',
            value: (this.position()?.liquidationPrice || 0).toString(),
            lineStyle: LineStyle.Dotted,
          },
        ]);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['symbol'] && changes['symbol'].firstChange) {
      this.isCollapsed.set(true);
    }

    if (changes['quantDataQuery']?.currentValue) {
      this.quantInfo.set(changes['quantDataQuery'].currentValue);
    }
  }

  ngOnInit(): void {
    if (this.quantData) {
      this.quantInfo.set(this.quantData);
    }
  }

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }

  onAiCheck(event: MouseEvent): void {
    event.stopPropagation();
    this.llmAnalyzeTokenMutation.mutate();
  }

  onOpenPosition(event: MouseEvent): void {
    event.stopPropagation();
    this.openPosition.emit(this.symbol);
  }

  onRemove(event: MouseEvent): void {
    event.stopPropagation();
    this.remove.emit();
  }
}
