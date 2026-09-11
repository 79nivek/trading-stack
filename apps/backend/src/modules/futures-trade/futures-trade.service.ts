import { Injectable } from '@nestjs/common';
import { FuturesTradeRepository } from './futures-trade.repository';
import { FuturesTrade } from './futures-trade.entity';

@Injectable()
export class FuturesTradeService {
  constructor(private readonly repo: FuturesTradeRepository) {}

  async findOneBySymbolAndTime(symbol: string, timestamp: Date): Promise<FuturesTrade | null> {
    return this.repo.findOneBySymbolAndTime(symbol, timestamp);
  }

  async saveTrade(data: Partial<FuturesTrade>): Promise<FuturesTrade> {
    return this.repo.saveTrade(data);
  }

  async findLastExitPrice(symbol: string): Promise<number | null> {
    return this.repo.findLastExitPrice(symbol);
  }

  async findTradesBetween(start: Date, end: Date): Promise<FuturesTrade[]> {
    return this.repo.findTradesBetween(start, end);
  }
}
