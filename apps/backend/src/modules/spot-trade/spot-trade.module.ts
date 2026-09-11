import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpotTrade } from './spot-trade.entity';
import { SpotTradeRepository } from './spot-trade.repository';
import { SpotTradeService } from './spot-trade.service';

@Module({
  imports: [TypeOrmModule.forFeature([SpotTrade])],
  providers: [SpotTradeRepository, SpotTradeService],
  exports: [SpotTradeService],
})
export class SpotTradeModule {}
