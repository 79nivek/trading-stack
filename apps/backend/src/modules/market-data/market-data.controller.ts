import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { IgnoreLog } from '../../core/decorators/ignore-log.decorator';

@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('klines/spot')
  @HttpCode(HttpStatus.OK)
  @IgnoreLog()
  async getSpotKlines(
    @Query('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('limit') limit = 500,
    @Query('endTime') endTime?: number,
  ) {
    if (!symbol || !interval) return [];
    return await this.marketDataService.getKlinesSpot(
      symbol,
      interval,
      Number(limit),
      endTime ? Number(endTime) : undefined,
    );
  }

  @Get('klines/futures')
  @HttpCode(HttpStatus.OK)
  @IgnoreLog()
  async getFuturesKlines(
    @Query('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('limit') limit = 500,
    @Query('endTime') endTime?: number,
  ) {
    if (!symbol || !interval) return [];
    return await this.marketDataService.getKlinesFutures(
      symbol,
      interval,
      Number(limit),
      endTime ? Number(endTime) : undefined,
    );
  }
}
