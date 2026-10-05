import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MarkedPrice } from './marked-price.entity';

@Injectable()
export class MarkedPriceRepository extends Repository<MarkedPrice> {
  constructor(dataSource: DataSource) {
    super(MarkedPrice, dataSource.createEntityManager());
  }

  async findBySymbol(userId: string, symbol: string): Promise<MarkedPrice[]> {
    return this.find({
      where: { userId, symbol },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneByIdAndUserId(userId: string, id: string): Promise<MarkedPrice | null> {
    return this.findOne({ where: { id, userId } });
  }
}
