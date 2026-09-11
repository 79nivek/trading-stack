import { Module } from '@nestjs/common';
import { PortfolioValuationService } from './portfolio-valuation.service';

@Module({
  providers: [PortfolioValuationService],
  exports: [PortfolioValuationService],
})
export class PortfolioValuationModule {}
