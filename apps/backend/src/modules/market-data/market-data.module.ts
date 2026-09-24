import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpotKline } from './entities/spot-kline.entity';
import { FuturesKline } from './entities/futures-kline.entity';
import { SpotKlineRepository } from './repositories/spot-kline.repository';
import { FuturesKlineRepository } from './repositories/futures-kline.repository';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SpotKline, FuturesKline])],
  controllers: [MarketDataController],
  providers: [SpotKlineRepository, FuturesKlineRepository, MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
