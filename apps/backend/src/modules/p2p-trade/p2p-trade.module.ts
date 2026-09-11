import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { P2PTrade } from './p2p-trade.entity';
import { P2PTradeRepository } from './p2p-trade.repository';
import { P2PTradeService } from './p2p-trade.service';

@Module({
  imports: [TypeOrmModule.forFeature([P2PTrade])],
  providers: [P2PTradeRepository, P2PTradeService],
  exports: [P2PTradeService],
})
export class P2PTradeModule {}
