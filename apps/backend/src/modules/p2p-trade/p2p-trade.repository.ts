import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { P2PTrade } from './p2p-trade.entity';

@Injectable()
export class P2PTradeRepository {
  constructor(
    @InjectRepository(P2PTrade)
    private readonly repo: Repository<P2PTrade>,
  ) {}

  async findOneByOrderNumber(orderNumber: string): Promise<P2PTrade | null> {
    return this.repo.findOne({ where: { orderNumber } });
  }

  async saveTrade(data: Partial<P2PTrade>): Promise<P2PTrade> {
    return this.repo.save(data);
  }

  async findAll(): Promise<P2PTrade[]> {
    return this.repo.find();
  }
}
