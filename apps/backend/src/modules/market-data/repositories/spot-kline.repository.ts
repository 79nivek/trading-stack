import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { SpotKline } from '../entities/spot-kline.entity';

@Injectable()
export class SpotKlineRepository {
  constructor(
    @InjectRepository(SpotKline)
    private readonly repository: Repository<SpotKline>,
  ) {}

  async findLatestKlines(symbol: string, interval: string, endTime: number, limit: number): Promise<SpotKline[]> {
    return this.repository.find({
      where: { symbol, interval, openTime: LessThanOrEqual(endTime) },
      order: { openTime: 'DESC' },
      take: limit,
    });
  }

  async upsertKlines(klines: Partial<SpotKline>[]): Promise<void> {
    if (klines.length === 0) return;
    await this.repository.upsert(klines, ['interval', 'symbol', 'openTime']);
  }
}
