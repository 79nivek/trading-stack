import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FuturesScannerService } from './futures-scanner.service';
import { PortfolioValuationModule } from '../portfolio-valuation/portfolio-valuation.module';
import { FuturesTradeModule } from '../futures-trade/futures-trade.module';

@Module({
  imports: [PortfolioValuationModule, ConfigModule, FuturesTradeModule],
  providers: [FuturesScannerService],
  exports: [FuturesScannerService],
})
export class FuturesScannerModule {}
