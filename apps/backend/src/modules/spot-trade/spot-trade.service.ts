import { Injectable } from '@nestjs/common';
import { SpotTradeRepository } from './spot-trade.repository';
import { SpotTrade } from './spot-trade.entity';

@Injectable()
export class SpotTradeService {
  constructor(private readonly repo: SpotTradeRepository) {}

  async findOneBySymbolAndTime(
    symbol: string,
    timestamp: Date,
  ): Promise<SpotTrade | null> {
    return this.repo.findOneBySymbolAndTime(symbol, timestamp);
  }

  async saveTrade(data: Partial<SpotTrade>): Promise<SpotTrade> {
    return this.repo.saveTrade(data);
  }

  async findAllBySymbol(symbol: string): Promise<SpotTrade[]> {
    return this.repo.findAllBySymbol(symbol);
  }

  async findTradesBetween(start: Date, end: Date): Promise<SpotTrade[]> {
    return this.repo.findTradesBetween(start, end);
  }
}
