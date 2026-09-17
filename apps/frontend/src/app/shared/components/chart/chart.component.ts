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
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { createChart, IChartApi, ISeriesApi, Time, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { BinanceFuturesApiService } from '../../../core/services/binance-futures-api.service';
import { FuturesWebsocketService } from '../../../core/services/futures-websocket.service';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss'
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() symbol = '';
  @Input() timeFrame = '1m';

  @ViewChild('chartContainer') chartContainer!: ElementRef;

  private chart: IChartApi | null = null;
  private candlestickSeries: ISeriesApi<'Candlestick'> | null = null;
  private volumeSeries: ISeriesApi<'Histogram'> | null = null;

  private binanceApi = inject(BinanceFuturesApiService);
  private wsService = inject(FuturesWebsocketService);
  private themeService = inject(ThemeService);

  private wsSubscription: Subscription | null = null;

  constructor() {
    effect(() => {
      this.applyTheme(this.themeService.theme());
    });
  }

  ngAfterViewInit(): void {
    if (this.chartContainer && this.chartContainer.nativeElement) {
      this.initChart();
      this.loadHistoricalData();
      this.applyBinanceFormatting();
      this.subscribeToRealtimeData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['symbol'] && !changes['symbol'].firstChange) ||
        (changes['timeFrame'] && !changes['timeFrame'].firstChange)) {
      if (this.chart) {
        this.loadHistoricalData();
        this.applyBinanceFormatting();
        this.subscribeToRealtimeData();
      }
    }
  }

  private async applyBinanceFormatting(): Promise<void> {
    if (!this.symbol) return;
    try {
      const info = await this.queryClient.fetchQuery({
        queryKey: ['exchangeInfo', this.symbol],
        queryFn: () => lastValueFrom(this.binanceApi.getExchangeInfo(this.symbol!)),
        staleTime: Infinity, // Exchange info rarely changes
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

  ngOnDestroy(): void {
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

  private initChart(): void {
    const chartOptions = {
      width: this.chartContainer.nativeElement.clientWidth,
      height: 400,
      layout: {
        background: { color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
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

    this.chart.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
      if (logicalRange !== null && logicalRange.from < 10) {
        this.loadMoreHistoricalData();
      }
    });
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
      }
    });
  }

  private queryClient = injectQueryClient();
  private earliestTime: number | null = null;
  private isLoadingMore = false;
  private currentData: any[] = [];
  private currentVolumeData: any[] = [];

  private async loadHistoricalData(): Promise<void> {
    if (!this.symbol || !this.timeFrame) return;

    try {
      const data = await this.queryClient.fetchQuery({
        queryKey: ['klines', this.symbol, this.timeFrame, 500, 'latest'],
        queryFn: () => lastValueFrom(this.binanceApi.getKlines(this.symbol!, this.timeFrame!)),
        staleTime: 1000 * 60 * 5, // 5 minutes
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
      }
    } catch (err) {
      console.error(`Failed to load historical data for ${this.symbol}:`, err);
    }
  }

  private async loadMoreHistoricalData(): Promise<void> {
    if (!this.symbol || !this.timeFrame || this.isLoadingMore || !this.earliestTime) return;

    this.isLoadingMore = true;
    // Binance API requires endTime in ms
    const endTime = (this.earliestTime * 1000) - 1;

    try {
      const data = await this.queryClient.fetchQuery({
        queryKey: ['klines', this.symbol, this.timeFrame, 500, endTime],
        queryFn: () => lastValueFrom(this.binanceApi.getKlines(this.symbol!, this.timeFrame!, 500, endTime)),
        staleTime: Infinity, // Historical past data never changes
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

        // Prepend older data
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
    if (!this.symbol || !this.timeFrame) return;

    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }

    this.wsService.setTimeFrame(this.timeFrame);
    this.wsSubscription = this.wsService.register(this.symbol, this.timeFrame).subscribe({
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

          // Update current data arrays to keep them in sync
          const lastCandleIndex = this.currentData.length - 1;
          if (lastCandleIndex >= 0 && this.currentData[lastCandleIndex].time === candle.time) {
            this.currentData[lastCandleIndex] = candle;
            this.currentVolumeData[lastCandleIndex] = volume;
          } else {
            this.currentData.push(candle);
            this.currentVolumeData.push(volume);
          }
        }
      },
      error: (err) => {
        console.error(`WebSocket error for ${this.symbol}:`, err);
      }
    });
  }
}
