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
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { ChartComponent, LineCheckPoint } from '../chart/chart.component';
import {
  TokenSuggestionDto,
  QuantAnalyzeResponseDto,
  ChartPrimaryColor,
  OrderType,
} from '@trading-stack/shared-dto';
import { calculatePnlAmount } from '@trading-stack/shared';
import { BackendApiService } from '../../../core/services/api/backend-api.service';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { LineStyle } from 'lightweight-charts';
import { AccountService } from '../../../core/services/account.service';
import { PopupService } from '../../../core/services/popup.service';

import { ChartMenuComponent } from '../chart-menu/chart-menu.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-token-card',
  standalone: true,
  imports: [
    CommonModule,
    TranslateDirective,
    TranslatePipe,
    ChartComponent,
    ChartMenuComponent,
    RouterLink,
  ],
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

  @ViewChild('chartMenu') chartMenu!: ChartMenuComponent;

  private backendApi = inject(BackendApiService);
  private toastService = inject(ToastService);
  private accountService = inject(AccountService);
  private popupService = inject(PopupService);

  isCollapsed = signal<boolean>(true);
  quantInfo = signal<TokenSuggestionDto | null>(null);
  temporaryLine = signal<LineCheckPoint | null>(null);

  fee = computed(() => {
    const pos = this.position();

    if (!pos) return 0;

    return (
      calculatePnlAmount({
        entryPrice: pos.entryPrice,
        positionAmt: pos.positionAmt,
        targetPrice: pos.breakEvenPrice,
      }) * 2
    );
  });

  unRealizedProfit = computed(() => +(this.position()?.unRealizedProfit || 0));

  pnl = computed(() => {
    return +this.unRealizedProfit() - this.fee();
  });

  lineCheckpoint = computed<LineCheckPoint[]>(() => {
    const pos = this.position();
    if (!pos) return [];

    const lines: LineCheckPoint[] = [
      {
        color: ChartPrimaryColor.ENTRY,
        title: 'Entry',
        value: pos.entryPrice.toString(),
        lineStyle: LineStyle.Solid,
      },
      {
        color: ChartPrimaryColor.LIQUIDATION,
        title: 'Liquidation',
        value: (pos.liquidationPrice || 0).toString(),
        lineStyle: LineStyle.Solid,
      },
    ];

    const entryPrice = parseFloat(pos.entryPrice || '0');
    let breakEvenPrice = parseFloat(pos.breakEvenPrice);

    // if (fee > 1 && positionAmt !== 0) {
    if (entryPrice > breakEvenPrice) {
      breakEvenPrice = entryPrice - Math.abs(breakEvenPrice - entryPrice) * 2;
    } else {
      breakEvenPrice = entryPrice + Math.abs(breakEvenPrice - entryPrice) * 2;
    }
    lines.push({
      color: ChartPrimaryColor.BREAK_EVEN,
      title: `BE(-$${this.fee().toFixed(2)})`,
      value: breakEvenPrice.toString(),
      lineStyle: LineStyle.Dotted,
    });
    // }

    const algoOrders = this.accountService.algoOrders().get(this.symbol);
    if (algoOrders) {
      algoOrders.forEach((order) => {
        if (!order.orderType) return;
        const pnl = calculatePnlAmount({
          entryPrice: pos.entryPrice,
          positionAmt: pos.positionAmt,
          targetPrice: order.triggerPrice,
        }).toFixed(2);
        if (
          order.orderType === OrderType.TAKE_PROFIT_LIMIT ||
          order.orderType === OrderType.TAKE_PROFIT_MARKET
        ) {
          lines.push({
            color: ChartPrimaryColor.TAKE_PROFIT,
            title: `TP ${pnl}`,
            value: order.triggerPrice || '',
            lineStyle: LineStyle.Solid,
          });

          return;
        }

        if (
          order.orderType === OrderType.STOP_LIMIT ||
          order.orderType === OrderType.STOP_MARKET
        ) {
          lines.push({
            color: ChartPrimaryColor.STOP_LOSS,
            title: `SL ${pnl}`,
            value: order.triggerPrice || '',
            lineStyle: LineStyle.Solid,
          });

          return;
        }

        if (order.orderType === OrderType.TRAILING_STOP_MARKET) {
          lines.push({
            color: ChartPrimaryColor.TRAILING_STOP_ACTIVE,
            title: 'TSL',
            value: order.activatePrice || '',
            lineStyle: LineStyle.Dotted,
          });
          lines.push({
            color: ChartPrimaryColor.TRAILING_STOP_PRICE,
            title: 'TSL',
            value: order.triggerPrice || '',
            lineStyle: LineStyle.Dotted,
          });

          return;
        }
      });
    }

    const orders = this.accountService.orders().get(this.symbol);
    if (orders) {
      orders.forEach((order) => {
        if (!order.type) return;

        lines.push({
          color: ChartPrimaryColor.TAKE_PROFIT,
          title: `TP ${order.price || ''}`,
          value: order.price || '',
          lineStyle: LineStyle.Solid,
        });

        return;
      });
    }

    const tempLine = this.temporaryLine();
    if (tempLine) {
      lines.push(tempLine);
    }
    return lines;
  });
  position = computed(() => this.accountService.positions().get(this.symbol));
  isOpeningPosition = computed(() => !!this.position());

  quantDataQuery = injectQuery(() => ({
    queryKey: ['analyze', this.symbol],
    queryFn: () =>
      lastValueFrom(this.backendApi.quantAnalyzeToken(this.symbol)),
    enabled: !!this.symbol && !this.quantData,
  }));

  llmAnalyzeTokenMutation = injectMutation(() => ({
    mutationFn: () =>
      lastValueFrom(this.backendApi.llmAnalyzeToken(this.symbol)),
    onSuccess: () => {
      this.isCollapsed.set(false);
    },
    onError: (err: any) => {
      this.toastService.show(
        err.error?.message || 'Failed to analyze token',
        'danger',
      );
    },
  }));

  closePositionMutation = injectMutation(() => ({
    mutationFn: () => lastValueFrom(this.backendApi.closePosition(this.symbol)),
    onSuccess: () => {
      this.toastService.show('Position closed successfully!', 'success', 2000);
      this.popupService.close();
    },
    onError: (err: any) => {
      this.toastService.show(
        err.error?.message || 'Failed to close position',
        'danger',
      );
    },
  }));

  constructor() {
    effect(() => {
      if (this.quantDataQuery.data()) {
        this.quantInfo.set(this.quantDataQuery.data() as TokenSuggestionDto);
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

  onCancel(event: MouseEvent): void {
    event.stopPropagation();

    const pos = this.position();
    if (!pos) return;

    // Calculate approximate PNL or fetch it if needed, wait, position object from accountService already has unrealizedProfit
    const pnl = pos.unRealizedProfit
      ? parseFloat(pos.unRealizedProfit).toFixed(2)
      : '0.00';
    const side = parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT';

    this.popupService.open({
      title: 'Close Position',
      message: `Are you sure you want to close the ${side} position for ${this.symbol}?\nEstimated PnL: $${pnl}`,
      buttons: [
        {
          text: 'Cancel',
          type: 'info',
          action: () => this.popupService.close(),
        },
        {
          text: 'Confirm',
          type: 'danger',
          action: () => {
            this.closePositionMutation.mutate();
          },
        },
      ],
    });
  }

  onRemove(event: MouseEvent): void {
    event.stopPropagation();
    this.remove.emit();
  }

  onRightClickChart(price: number) {
    this.chartMenu.setPoint(price);

    this.temporaryLine.set({
      color: ChartPrimaryColor.TEMPORARY_LINE,
      title: 'Temp',
      value: price.toString(),
      lineStyle: LineStyle.Dotted,
    });
  }

  onChartMenuClose() {
    this.temporaryLine.set(null);
  }
}
