import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull } from 'typeorm';
import { FuturesTrade } from './futures-trade.entity';

@Injectable()
export class FuturesTradeRepository {
  constructor(
    @InjectRepository(FuturesTrade)
    private readonly repo: Repository<FuturesTrade>,
  ) {}

  async findOneBySymbolAndTime(symbol: string, timestamp: Date): Promise<FuturesTrade | null> {
    return this.repo.findOne({ where: { symbol, timestamp } });
  }

  async saveTrade(data: Partial<FuturesTrade>): Promise<FuturesTrade> {
    return this.repo.save(data);
  }

  async findLastExitPrice(symbol: string): Promise<number | null> {
    const trade = await this.repo.findOne({ where: { symbol, exitPrice: Not(IsNull()) }, order: { timestamp: 'DESC' } });
    return trade ? trade.exitPrice || trade.price : null;
  }

  async findTradesBetween(start: Date, end: Date): Promise<FuturesTrade[]> {
    return this.repo.find({
      where: { timestamp: Between(start, end) },
    });
  }
}
