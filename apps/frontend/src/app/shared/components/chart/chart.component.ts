import { DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
  effect
} from '@angular/core';

import { createChart, IChartApi, ISeriesApi, Time, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom, Subscription } from 'rxjs';
import { BinanceFuturesApiService } from '../../../core/services/binance-futures-api.service';
import { FuturesWebsocketService } from '../../../core/services/futures-websocket.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ChartSyncService } from '../../../core/services/chart-sync.service';
import { TimeframeService } from '../../../core/services/timeframe.service';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss'
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() symbol = '';
  /** syncGroup để đồng bộ zoom/crosshair giữa các chart cùng nhóm. */
  @Input() syncGroup = '';

  @ViewChild('chartContainer') chartContainer!: ElementRef;

  private chart: IChartApi | null = null;
  private candlestickSeries: ISeriesApi<'Candlestick'> | null = null;
  private volumeSeries: ISeriesApi<'Histogram'> | null = null;

  private ma7Series: ISeriesApi<'Line'> | null = null;
  private ma25Series: ISeriesApi<'Line'> | null = null;
  private ma99Series: ISeriesApi<'Line'> | null = null;

  hoveredData = signal<any>(null);

  private binanceApi = inject(BinanceFuturesApiService);
  private wsService = inject(FuturesWebsocketService);
  private themeService = inject(ThemeService);
  private chartSync = inject(ChartSyncService);
  private timeframeService = inject(TimeframeService);

  private wsSubscription: Subscription | null = null;
  private syncCrosshairSub: Subscription | null = null;
  private syncZoomSub: Subscription | null = null;

  /** Unique ID để phân biệt source khi broadcast sync events. */
  private readonly instanceId = `chart-${Math.random().toString(36).slice(2)}`;

  /** Flag để tránh vòng lặp vô hạn khi đang apply sync từ service. */
  private isSyncingCrosshair = false;
  private isSyncingZoom = false;

  constructor() {
    effect(() => {
      this.applyTheme(this.themeService.theme());
    });

    // Reactive: tự động reload khi global timeframe thay đổi
    effect(() => {
      this.timeframeService.timeframe(); // đọc signal để đăng ký reactive dependency
      if (this.chart) {
        this.loadHistoricalData();
        this.applyBinanceFormatting();
        this.subscribeToRealtimeData();
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.chartContainer && this.chartContainer.nativeElement) {
      this.initChart();
      this.loadHistoricalData();
      this.applyBinanceFormatting();
      this.subscribeToRealtimeData();
      this.subscribeSyncEvents();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const symbolChanged = changes['symbol'] && !changes['symbol'].firstChange;
    const syncGroupChanged = changes['syncGroup'] && !changes['syncGroup'].firstChange;

    if (symbolChanged) {
      if (this.chart) {
        this.loadHistoricalData();
        this.applyBinanceFormatting();
        this.subscribeToRealtimeData();
      }
    }

    if (syncGroupChanged) {
      this.subscribeSyncEvents();
    }
  }

  ngOnDestroy(): void {
    this.syncCrosshairSub?.unsubscribe();
    this.syncZoomSub?.unsubscribe();
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    if (this.symbol) {
      this.wsService.unregister(this.symbol);
    }
    if (this.chart) {
      this.chart.remove();
    }
  }

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------

  private subscribeSyncEvents(): void {
    // Hủy subscriptions cũ trước khi đăng ký lại
    this.syncCrosshairSub?.unsubscribe();
    this.syncZoomSub?.unsubscribe();
    this.syncCrosshairSub = null;
    this.syncZoomSub = null;

    if (!this.syncGroup || !this.chart) return;

    // Nhận crosshair từ chart khác → apply lên chart này
    this.syncCrosshairSub = this.chartSync
      .onCrosshair(this.syncGroup, this.instanceId)
      .subscribe((event) => {
        if (!this.chart) return;
        this.isSyncingCrosshair = true;
        if (event.time !== null) {
          this.chart.setCrosshairPosition(
            0,
            event.time as Time,
            this.candlestickSeries!
          );
        } else {
          this.chart.clearCrosshairPosition();
        }
        this.isSyncingCrosshair = false;
      });

    // Nhận zoom từ chart khác → apply lên chart này
    this.syncZoomSub = this.chartSync
      .onZoom(this.syncGroup, this.instanceId)
      .subscribe((event) => {
        if (!this.chart || !event.range) return;
        this.isSyncingZoom = true;
        this.chart.timeScale().setVisibleLogicalRange(event.range);
        this.isSyncingZoom = false;
      });
  }

  // ---------------------------------------------------------------------------
  // Chart init
  // ---------------------------------------------------------------------------

  private async applyBinanceFormatting(): Promise<void> {
    if (!this.symbol) return;
    try {
      const info = await this.queryClient.fetchQuery({
        queryKey: ['exchangeInfo', this.symbol],
        queryFn: () => lastValueFrom(this.binanceApi.getExchangeInfo(this.symbol!)),
        staleTime: Infinity,
      });
      if (this.candlestickSeries) {
        this.candlestickSeries.applyOptions({
          priceFormat: {
            type: 'price',
            precision: info.pricePrecision,
            minMove: parseFloat(info.tickSize),
          }
        });
      }
    } catch (err) {
      console.error('Failed to get exchange info', err);
    }
  }

  private initChart(): void {
    const isDark = this.themeService.theme() === 'dark';

    const chartOptions = {
      width: this.chartContainer.nativeElement.clientWidth,
      height: 400,
      layout: {
        background: { color: 'transparent' },
        textColor: isDark ? '#d1d5db' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(42, 46, 57, 0.5)' : 'rgba(229, 231, 235, 0.5)' },
        horzLines: { color: isDark ? 'rgba(42, 46, 57, 0.5)' : 'rgba(229, 231, 235, 0.5)' },
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(197, 203, 206, 0.8)' : 'rgba(0, 0, 0, 0.2)',
      },
      timeScale: {
        borderColor: isDark ? 'rgba(197, 203, 206, 0.8)' : 'rgba(0, 0, 0, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
    };

    this.chart = createChart(this.chartContainer.nativeElement, chartOptions);

    this.candlestickSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    this.volumeSeries = this.chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    this.ma7Series = this.chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
    this.ma25Series = this.chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
    this.ma99Series = this.chart.addSeries(LineSeries, { color: '#ec4899', lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });

    // Crosshair move: cập nhật legend + broadcast sync
    this.chart.subscribeCrosshairMove((param) => {
      const isOutside =
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > this.chartContainer.nativeElement.clientWidth ||
        param.point.y < 0 ||
        param.point.y > 400;

      if (isOutside) {
        if (this.currentData.length > 0) {
          this.updateHoveredDataWithLatest();
        } else {
          this.hoveredData.set(null);
        }

        // Broadcast clear crosshair khi ra ngoài chart
        if (!this.isSyncingCrosshair && this.syncGroup) {
          this.chartSync.emitCrosshair({
            groupId: this.syncGroup,
            sourceId: this.instanceId,
            time: null,
            point: null,
          });
        }
      } else {
        const candleData = param.seriesData.get(this.candlestickSeries!);
        const volData = param.seriesData.get(this.volumeSeries!);
        const ma7 = param.seriesData.get(this.ma7Series!);
        const ma25 = param.seriesData.get(this.ma25Series!);
        const ma99 = param.seriesData.get(this.ma99Series!);

        if (candleData) {
          this.hoveredData.set({
            candle: candleData,
            vol: (volData as any)?.value,
            ma7: (ma7 as any)?.value,
            ma25: (ma25 as any)?.value,
            ma99: (ma99 as any)?.value,
          });
        }

        // Broadcast crosshair position sang chart khác
        if (!this.isSyncingCrosshair && this.syncGroup && param.time) {
          this.chartSync.emitCrosshair({
            groupId: this.syncGroup,
            sourceId: this.instanceId,
            time: param.time as number,
            point: param.point ?? null,
          });
        }
      }
    });

    this.chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== this.chartContainer.nativeElement) {
        return;
      }
      const newRect = entries[0].contentRect;
      this.chart?.applyOptions({ width: newRect.width, height: newRect.height });
    });
    resizeObserver.observe(this.chartContainer.nativeElement);

    // Zoom/pan: load thêm dữ liệu + broadcast sync
    this.chart.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
      if (logicalRange !== null && logicalRange.from < 10) {
        this.loadMoreHistoricalData();
      }

      // Broadcast zoom sang chart khác
      if (!this.isSyncingZoom && this.syncGroup) {
        this.chartSync.emitZoom({
          groupId: this.syncGroup,
          sourceId: this.instanceId,
          range: logicalRange,
        });
      }
    });

    // Đăng ký sync events sau khi chart đã khởi tạo xong
    this.subscribeSyncEvents();
  }

  private applyTheme(theme: string): void {
    if (!this.chart) return;
    const isDark = theme === 'dark';
    this.chart.applyOptions({
      layout: {
        background: { color: 'transparent' },
        textColor: isDark ? '#d1d5db' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(42, 46, 57, 0.5)' : 'rgba(229, 231, 235, 0.5)' },
        horzLines: { color: isDark ? 'rgba(42, 46, 57, 0.5)' : 'rgba(229, 231, 235, 0.5)' },
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(197, 203, 206, 0.8)' : 'rgba(0, 0, 0, 0.2)',
      },
      timeScale: {
        borderColor: isDark ? 'rgba(197, 203, 206, 0.8)' : 'rgba(0, 0, 0, 0.2)',
      }
    });
  }

  private queryClient = injectQueryClient();

  private calculateSMA(data: any[], period: number): { time: Time; value: number }[] {
    const smaData = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      smaData.push({ time: data[i].time, value: sum / period });
    }
    return smaData;
  }

  private updateMAs(): void {
    if (!this.ma7Series || !this.ma25Series || !this.ma99Series) return;
    this.ma7Series.setData(this.calculateSMA(this.currentData, 7));
    this.ma25Series.setData(this.calculateSMA(this.currentData, 25));
    this.ma99Series.setData(this.calculateSMA(this.currentData, 99));
  }

  private updateHoveredDataWithLatest(): void {
    if (this.currentData.length === 0) return;

    const getSma = (period: number) => {
      if (this.currentData.length < period) return undefined;
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += this.currentData[this.currentData.length - 1 - j].close;
      }
      return sum / period;
    };

    this.hoveredData.set({
      candle: this.currentData[this.currentData.length - 1],
      vol: this.currentVolumeData[this.currentVolumeData.length - 1]?.value,
      ma7: getSma(7),
      ma25: getSma(25),
      ma99: getSma(99),
    });
  }

  private earliestTime: number | null = null;
  private isLoadingMore = false;
  private currentData: any[] = [];
  private currentVolumeData: any[] = [];

  private async loadHistoricalData(): Promise<void> {
    const tf = this.timeframeService.timeframe();
    if (!this.symbol || !tf) return;

    try {
      const data = await this.queryClient.fetchQuery({
        queryKey: ['klines', this.symbol, tf, 500, 'latest'],
        queryFn: () => lastValueFrom(this.binanceApi.getKlines(this.symbol!, tf)),
        staleTime: 1000 * 60 * 5,
      });

      if (this.candlestickSeries && this.volumeSeries && data.length > 0) {
        this.earliestTime = data[0].time as number;

        this.currentData = data.map(d => ({
          time: d.time as Time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));
        this.currentVolumeData = data.map(d => ({
          time: d.time as Time,
          value: d.volume,
          color: d.close >= d.open ? '#26a69a80' : '#ef535080'
        }));

        this.candlestickSeries.setData(this.currentData);
        this.volumeSeries.setData(this.currentVolumeData);
        this.updateMAs();
        this.updateHoveredDataWithLatest();
      }
    } catch (err) {
      console.error(`Failed to load historical data for ${this.symbol}:`, err);
    }
  }

  private async loadMoreHistoricalData(): Promise<void> {
    const tf = this.timeframeService.timeframe();
    if (!this.symbol || !tf || this.isLoadingMore || !this.earliestTime) return;

    this.isLoadingMore = true;
    const endTime = (this.earliestTime * 1000) - 1;

    try {
      const data = await this.queryClient.fetchQuery({
        queryKey: ['klines', this.symbol, tf, 500, endTime],
        queryFn: () => lastValueFrom(this.binanceApi.getKlines(this.symbol!, tf, 500, endTime)),
        staleTime: Infinity,
      });

      if (this.candlestickSeries && this.volumeSeries && data.length > 0) {
        this.earliestTime = data[0].time as number;

        const olderCandles = data.map(d => ({
          time: d.time as Time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));
        const olderVolumes = data.map(d => ({
          time: d.time as Time,
          value: d.volume,
          color: d.close >= d.open ? '#26a69a80' : '#ef535080'
        }));

        this.currentData = [...olderCandles, ...this.currentData];
        this.currentVolumeData = [...olderVolumes, ...this.currentVolumeData];

        this.candlestickSeries.setData(this.currentData);
        this.volumeSeries.setData(this.currentVolumeData);
      }
    } catch (err) {
      console.error(`Failed to load more data for ${this.symbol}:`, err);
    } finally {
      this.isLoadingMore = false;
    }
  }

  private subscribeToRealtimeData(): void {
    const tf = this.timeframeService.timeframe();
    if (!this.symbol || !tf) return;

    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }

    this.wsService.setTimeFrame(tf);
    this.wsSubscription = this.wsService.register(this.symbol, tf).subscribe({
      next: (kline) => {
        if (this.candlestickSeries && this.volumeSeries) {
          const candle = {
            time: kline.time as Time,
            open: kline.open,
            high: kline.high,
            low: kline.low,
            close: kline.close,
          };
          const volume = {
            time: kline.time as Time,
            value: kline.volume,
            color: kline.close >= kline.open ? '#26a69a80' : '#ef535080'
          };

          this.candlestickSeries.update(candle);
          this.volumeSeries.update(volume);

          const lastCandleIndex = this.currentData.length - 1;
          if (lastCandleIndex >= 0 && this.currentData[lastCandleIndex].time === candle.time) {
            this.currentData[lastCandleIndex] = candle;
            this.currentVolumeData[lastCandleIndex] = volume;
          } else {
            this.currentData.push(candle);
            this.currentVolumeData.push(volume);
          }

          this.updateMAs();
          if (!this.hoveredData() || this.hoveredData()?.candle?.time === candle.time) {
            this.updateHoveredDataWithLatest();
          }
        }
      },
      error: (err) => {
        console.error(`WebSocket error for ${this.symbol}:`, err);
      }
    });
  }
}
