import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SpotKlineRepository } from './repositories/spot-kline.repository';
import { FuturesKlineRepository } from './repositories/futures-kline.repository';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

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
        const baseUrl = 'https://fapi.binance.com/fapi/v1';
        const url = `${baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}${endTime ? `&endTime=${endTime}` : ''}`;
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
        const baseUrl = 'https://api.binance.com/api/v3';
        const url = `${baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}${endTime ? `&endTime=${endTime}` : ''}`;
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
}
