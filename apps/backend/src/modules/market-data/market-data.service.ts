import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SpotKlineRepository } from './repositories/spot-kline.repository';
import { FuturesKlineRepository } from './repositories/futures-kline.repository';
import { PremiumIndex, Ticker24h } from '@trading-stack/shared-dto';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  private BASE_FUTURES_API_URL = 'https://fapi.binance.com/fapi/v1';
  private BASE_SPOT_API_URL = 'https://api.binance.com/api/v3';

  ticket24hDataCache: Map<string, Ticker24h> = new Map();
  private ticket24hDataCacheTime = 0;

  premiumIndexCache: Map<string, PremiumIndex> = new Map();
  private premiumIndexCacheTime = 0;

  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minute in milliseconds

  constructor(
    private readonly dataSource: DataSource,
    private readonly spotKlineRepo: SpotKlineRepository,
    private readonly futuresKlineRepo: FuturesKlineRepository,
  ) {}

  private parseInterval(interval: string): number {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1));
    switch (unit) {
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'w':
        return value * 7 * 24 * 60 * 60 * 1000;
      case 'M':
        return value * 30 * 24 * 60 * 60 * 1000;
      default:
        return 60 * 1000;
    }
  }

  async getKlinesFutures(
    symbol: string,
    interval: string,
    limit: number,
    endTime?: number,
  ) {
    const resolvedEndTime = endTime ? Number(endTime) : Date.now();
    const intervalMs = this.parseInterval(interval);

    const dbKlines = await this.futuresKlineRepo.findLatestKlines(
      symbol,
      interval,
      resolvedEndTime,
      limit,
    );

    let needsFetch = false;
    if (dbKlines.length < limit) {
      needsFetch = true;
    } else {
      const latestOpenTime = Number(dbKlines[0].openTime);
      const expectedLatestOpenTime =
        Math.floor(resolvedEndTime / intervalMs) * intervalMs;
      if (latestOpenTime < expectedLatestOpenTime) {
        needsFetch = true;
      }
    }

    if (needsFetch) {
      this.logger.log(
        `Cache miss/stale for ${symbol} ${interval} [FUTURES]. Fetching from Binance...`,
      );
      try {
        const url = `${this.BASE_FUTURES_API_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}${endTime ? `&endTime=${endTime}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Binance API error: ${response.statusText}`);
        }
        const binanceData = (await response.json()) as any[][];

        if (!binanceData || binanceData.length === 0) return;

        const entities = binanceData.map((k) => ({
          symbol,
          interval,
          openTime: k[0],
          open: k[1],
          high: k[2],
          low: k[3],
          close: k[4],
          baseVolume: k[5],
          closeTime: k[6],
          quoteVolume: k[7],
        }));

        this.futuresKlineRepo
          .upsertKlines(entities)
          .catch((err) =>
            this.logger.error('Failed to save klines to DB', err),
          );

        return binanceData;
      } catch (error) {
        this.logger.error(
          'Error fetching from Binance, falling back to DB data if available',
          error,
        );
      }
    }

    return dbKlines
      .reverse()
      .map((k: any) => [
        Number(k.openTime),
        k.open,
        k.high,
        k.low,
        k.close,
        k.baseVolume,
        Number(k.closeTime),
        k.quoteVolume,
        0,
        '0',
        '0',
        '0',
      ]);
  }

  async getKlinesSpot(
    symbol: string,
    interval: string,
    limit: number,
    endTime?: number,
  ) {
    const resolvedEndTime = endTime ? Number(endTime) : Date.now();
    const intervalMs = this.parseInterval(interval);

    const dbKlines = await this.spotKlineRepo.findLatestKlines(
      symbol,
      interval,
      resolvedEndTime,
      limit,
    );

    let needsFetch = false;
    if (dbKlines.length < limit) {
      needsFetch = true;
    } else {
      const latestOpenTime = Number(dbKlines[0].openTime);
      const expectedLatestOpenTime =
        Math.floor(resolvedEndTime / intervalMs) * intervalMs;
      if (latestOpenTime < expectedLatestOpenTime) {
        needsFetch = true;
      }
    }

    if (needsFetch) {
      this.logger.log(
        `Cache miss/stale for ${symbol} ${interval} [FUTURES]. Fetching from Binance...`,
      );
      try {
        const url = `${this.BASE_SPOT_API_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}${endTime ? `&endTime=${endTime}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Binance API error: ${response.statusText}`);
        }
        const binanceData = (await response.json()) as any[][];

        if (!binanceData || binanceData.length === 0) return;

        const entities = binanceData.map((k) => ({
          symbol,
          interval,
          openTime: k[0],
          open: k[1],
          high: k[2],
          low: k[3],
          close: k[4],
          baseVolume: k[5],
          closeTime: k[6],
          quoteVolume: k[7],
        }));

        this.spotKlineRepo
          .upsertKlines(entities)
          .catch((err) =>
            this.logger.error('Failed to save klines to DB', err),
          );

        return binanceData;
      } catch (error) {
        this.logger.error(
          'Error fetching from Binance, falling back to DB data if available',
          error,
        );
      }
    }

    return dbKlines
      .reverse()
      .map((k: any) => [
        Number(k.openTime),
        k.open,
        k.high,
        k.low,
        k.close,
        k.baseVolume,
        Number(k.closeTime),
        k.quoteVolume,
        0,
        '0',
        '0',
        '0',
      ]);
  }

  async fetch24hTickerData(): Promise<Map<string, Ticker24h>>;
  // eslint-disable-next-line no-unused-vars
  async fetch24hTickerData(symbol: string): Promise<Ticker24h | undefined>;
  async fetch24hTickerData(
    symbol?: string,
  ): Promise<(Ticker24h | undefined) | Map<string, Ticker24h>> {
    if (
      this.ticket24hDataCache.size > 0 &&
      Date.now() - this.ticket24hDataCacheTime < this.CACHE_TTL
    ) {
      if (symbol) {
        return this.ticket24hDataCache.get(symbol);
      }
      return this.ticket24hDataCache;
    }

    const tickerRes = await fetch(`${this.BASE_FUTURES_API_URL}/ticker/24hr`);
    const tickers = (await tickerRes.json()) as Ticker24h[];

    const tickerMap = new Map<string, Ticker24h>();
    tickers.forEach((t) => tickerMap.set(t.symbol, t));

    this.ticket24hDataCache = tickerMap;
    this.ticket24hDataCacheTime = Date.now();

    return symbol ? tickerMap.get(symbol) : tickerMap;
  }

  async fetchPremiumIndex(): Promise<Map<string, PremiumIndex>>;
  // eslint-disable-next-line no-unused-vars
  async fetchPremiumIndex(symbol: string): Promise<PremiumIndex | undefined>;
  async fetchPremiumIndex(
    symbol?: string,
  ): Promise<(PremiumIndex | undefined) | Map<string, PremiumIndex>> {
    if (
      this.premiumIndexCache.size > 0 &&
      Date.now() - this.premiumIndexCacheTime < this.CACHE_TTL
    ) {
      if (symbol) {
        return this.premiumIndexCache.get(symbol);
      }
      return this.premiumIndexCache;
    }

    const premiumRes = await fetch(`${this.BASE_FUTURES_API_URL}/premiumIndex`);
    const premiumData = (await premiumRes.json()) as PremiumIndex[];

    const premiumMap = new Map<string, PremiumIndex>();
    premiumData.forEach((p) => premiumMap.set(p.symbol, p));

    this.premiumIndexCache = premiumMap;
    this.premiumIndexCacheTime = Date.now();

    return symbol ? premiumMap.get(symbol) : premiumMap;
  }
}
