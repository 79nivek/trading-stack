import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { FuturesKline } from '../entities/futures-kline.entity';

@Injectable()
export class FuturesKlineRepository {
  constructor(
    @InjectRepository(FuturesKline)
    private readonly repository: Repository<FuturesKline>,
  ) {}

  async findLatestKlines(symbol: string, interval: string, endTime: number, limit: number): Promise<FuturesKline[]> {
    return this.repository.find({
      where: { symbol, interval, openTime: LessThanOrEqual(endTime) },
      order: { openTime: 'DESC' },
      take: limit,
    });
  }

  async upsertKlines(klines: Partial<FuturesKline>[]): Promise<void> {
    if (klines.length === 0) return;
    await this.repository.upsert(klines, ['interval', 'symbol', 'openTime']);
  }
}
