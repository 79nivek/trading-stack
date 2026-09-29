import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BinanceCredential } from './binance-credential.entity';

@Injectable()
export class BinanceCredentialRepository extends Repository<BinanceCredential> {
  constructor(dataSource: DataSource) {
    super(BinanceCredential, dataSource.createEntityManager());
  }

  async findByUserId(userId: string): Promise<BinanceCredential | null> {
    return this.findOne({ where: { userId } });
  }
}
