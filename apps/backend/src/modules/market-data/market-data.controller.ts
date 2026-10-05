import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { IgnoreLog } from '../../core/decorators/ignore-log.decorator';
import { KlinesRequestDto } from '@trading-stack/shared-dto';

@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('klines/spot')
  @HttpCode(HttpStatus.OK)
  @IgnoreLog()
  async getSpotKlines(@Query() query: KlinesRequestDto) {
    if (!query.symbol || !query.interval) return [];
    return this.marketDataService.getKlinesSpot(query);
  }

  @Get('klines/futures')
  @HttpCode(HttpStatus.OK)
  @IgnoreLog()
  async getFuturesKlines(@Query() query: KlinesRequestDto) {
    if (!query.symbol || !query.interval) return [];
    return this.marketDataService.getKlinesFutures(query);
  }

  @Get('klines/futures/refresh')
  @HttpCode(HttpStatus.OK)
  @IgnoreLog()
  async refreshFuturesKlines(@Query() query: KlinesRequestDto) {
    if (!query.symbol || !query.interval) return [];
    return this.marketDataService.refreshFuturesKlines(query);
  }

  @Get('exchangeInfo')
  @HttpCode(HttpStatus.OK)
  @IgnoreLog()
  async getExchangeInfo() {
    return this.marketDataService.getExchangeInfo();
  }
}
