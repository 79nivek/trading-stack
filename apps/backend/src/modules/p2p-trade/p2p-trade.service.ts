import { Injectable } from '@nestjs/common';
import { P2PTradeRepository } from './p2p-trade.repository';
import { P2PTrade } from './p2p-trade.entity';

@Injectable()
export class P2PTradeService {
  constructor(private readonly repo: P2PTradeRepository) {}

  async findOneByOrderNumber(orderNumber: string): Promise<P2PTrade | null> {
    return this.repo.findOneByOrderNumber(orderNumber);
  }

  async saveTrade(data: Partial<P2PTrade>): Promise<P2PTrade> {
    return this.repo.saveTrade(data);
  }

  async findAll(): Promise<P2PTrade[]> {
    return this.repo.findAll();
  }
}
