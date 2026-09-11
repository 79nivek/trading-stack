import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SpotTrade } from './spot-trade.entity';

@Injectable()
export class SpotTradeRepository {
  constructor(
    @InjectRepository(SpotTrade)
    private readonly repo: Repository<SpotTrade>,
  ) {}

  async findOneBySymbolAndTime(symbol: string, timestamp: Date): Promise<SpotTrade | null> {
    return this.repo.findOne({ where: { symbol, timestamp } });
  }

  async saveTrade(data: Partial<SpotTrade>): Promise<SpotTrade> {
    return this.repo.save(data);
  }

  async findAllBySymbol(symbol: string): Promise<SpotTrade[]> {
    return this.repo.find({ where: { symbol }, order: { timestamp: "ASC" } });
  }

  async findTradesBetween(start: Date, end: Date): Promise<SpotTrade[]> {
    return this.repo.find({
      where: { timestamp: Between(start, end) },
    });
  }
}
