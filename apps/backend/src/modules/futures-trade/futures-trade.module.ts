import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FuturesTrade } from './futures-trade.entity';
import { FuturesTradeRepository } from './futures-trade.repository';
import { FuturesTradeService } from './futures-trade.service';

@Module({
  imports: [TypeOrmModule.forFeature([FuturesTrade])],
  providers: [FuturesTradeRepository, FuturesTradeService],
  exports: [FuturesTradeService],
})
export class FuturesTradeModule {}
