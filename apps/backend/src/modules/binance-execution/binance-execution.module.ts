import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BinanceFuturesExecutionService } from './binance-execution.service';
import { FuturesTradeModule } from '../futures-trade/futures-trade.module';

@Global()
@Module({
  imports: [ConfigModule, FuturesTradeModule],
  providers: [BinanceFuturesExecutionService],
  exports: [BinanceFuturesExecutionService],
})
export class BinanceExecutionModule {}
