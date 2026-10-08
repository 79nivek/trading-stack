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
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { ChartComponent, LineCheckPoint } from '../chart/chart.component';
import {
  TokenSuggestionDto,
  QuantAnalyzeResponseDto,
  ChartPrimaryColor,
  OrderType,
  OppositeSide,
  Direction,
} from '@trading-stack/shared-dto';
import {
  calculatePnlAmount,
  oppositeSiteToDirection,
} from '@trading-stack/shared';
import { LineStyle } from 'lightweight-charts';
import { PopupService } from '../../../core/services/popup.service';

import { ChartMenuComponent } from '../chart-menu/chart-menu.component';
import { RouterLink } from '@angular/router';
import { injectMarkedPriceQuery } from '../../../core/queries/marked-price.query';
import { injectForecastQuery } from '../../../core/queries/forecast.query';
import {
  injectOrderQuery,
  injectAlgoOrderQuery,
} from '../../../core/queries/order.query';
import {
  injectClosePositionMutation,
  injectPositionQuery,
} from '../../../core/queries/position.query';
import {
  injectLlmAnalyzeTokenQuery,
  injectQuantAnalyzeTokenQuery,
} from '../../../core/queries/analyze.query';
import { ChartDataService } from '../../../core/services/chart-data.service';

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
  symbol = input.required<string>();

  @Input({ required: false }) quantData: QuantAnalyzeResponseDto | null = null;

  /** Optional rank index (1-based). If provided, shows a rank badge. */
  @Input() index?: number;

  /** Chart sync group key */
  @Input() syncGroup = 'token-card';

  /** Whether to show the Remove button in the card header */
  @Input() showRemoveButton = false;
  @Input() showLMForecast = false;
  /**
   * When true, a drag handle icon appears at the left of the header.
   * The parent is responsible for setting draggable="true" on the wrapper
   * and handling dragstart/dragend events.
   */
  @Input() draggable = false;

  @Input() fullWidth = false;

  @Output() openPosition = new EventEmitter<string>();
  @Output() remove = new EventEmitter<void>();
  @Output() dragHover = new EventEmitter<boolean>();

  @ViewChild('chartMenu') chartMenu!: ChartMenuComponent;

  private popupService = inject(PopupService);
  private chartDataService = inject(ChartDataService);

  private positionQuery = injectPositionQuery();
  private orderQuery = injectOrderQuery();
  private algoOrderQuery = injectAlgoOrderQuery();

  position = computed(() => {
    return this.positionQuery.data()?.get(this.symbol());
  });

  realtimePosition = this.chartDataService.registerSymbolRealtime(this.symbol);

  isCollapsed = signal<boolean>(true)
  // showClearAlgoOrder = computed(() => this.algoOrderQuery.data()?.get(this.symbol())?.length > 0);
  quantInfo = signal<TokenSuggestionDto | null>(null);
  temporaryLine = signal<LineCheckPoint | null>(null);

  lineCheckpoint = computed<LineCheckPoint[]>(() => {
    const pos = this.position();
    const lines: LineCheckPoint[] = [];
    const sym = this.symbol();

    if (!sym) return [];

    if (pos) {
      lines.push(
        {
          color: ChartPrimaryColor.ENTRY,
          title: `Entry ${Number(pos.isolatedWallet || 0).toFixed(2)}`,
          value: pos.entryPrice.toString(),
          lineStyle: LineStyle.Solid,
        },
        {
          color: ChartPrimaryColor.LIQUIDATION,
          title: 'Liquidation',
          value: (pos.liquidationPrice || 0).toString(),
          lineStyle: LineStyle.Solid,
        },
      );

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
        title: `BE(-$${pos.fee.toFixed(2)})`,
        value: breakEvenPrice.toString(),
        lineStyle: LineStyle.Dotted,
      });

      // }

      const algoOrders = this.algoOrderQuery.data()?.get(sym);
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
    }
    const orders = this.orderQuery.data()?.get(sym);
    orders?.forEach((order) => {
      if (order) {
        const side = oppositeSiteToDirection(order.side as OppositeSide);

        lines.push({
          color:
            side === Direction.LONG
              ? ChartPrimaryColor.ORDER_LONG_PENDING
              : ChartPrimaryColor.ORDER_SHORT_PENDING,
          title: side,
          value: order.price || '',
          lineStyle: LineStyle.Dashed,
        });
      }
    });
    this.markedPriceQuery.data()?.forEach((marked, i) => {
      if (marked) {
        lines.push({
          color: ChartPrimaryColor.MARKED_PRICE,
          title: marked.title || 'MP - ' + (i + 1),
          value: marked.price.toString(),
          lineStyle: LineStyle.Dashed,
        });
      }
    });

    const tempLine = this.temporaryLine();
    if (tempLine) {
      lines.push(tempLine);
    }
    return lines;
  });

  isOpeningPosition = computed(
    () => !!this.position() && +(this.position()?.positionAmt || 0) !== 0,
  );

  isPendingOrder = computed(() => {
    const orders = this.orderQuery.data()?.get(this.symbol() || '');
    return !!orders && orders.length > 0 && !!this.position();
  });

  quantDataQuery = injectQuantAnalyzeTokenQuery(this.symbol);

  forecastDataQuery = injectForecastQuery(this.symbol);

  llmAnalyzeTokenMutation = injectLlmAnalyzeTokenQuery(this.symbol);

  closePositionMutation = injectClosePositionMutation(this.symbol);

  markedPriceQuery = injectMarkedPriceQuery(this.symbol);

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
    this.llmAnalyzeTokenMutation.refetch();
  }

  onReloadForecast(event: MouseEvent): void {
    event.stopPropagation();
    this.forecastDataQuery.refetch();
  }

  onOpenPosition(event: MouseEvent): void {
    event.stopPropagation();
    this.openPosition.emit(this.symbol() || '');
  }

  onCancel(event: MouseEvent): void {
    event.stopPropagation();

    const pos = this.position();
    if (!pos) return;

    const side = parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT';

    this.popupService.open({
      title: 'Close Position',
      message: `Are you sure you want to close the ${side} position for ${this.symbol}?\nEstimated PnL: $${this.realtimePosition()?.pnl.toFixed(2)}`,
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
