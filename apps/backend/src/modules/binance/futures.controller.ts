import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
import { BinanceService } from './binance.service';
import { FindOneSymbolDto, SetOrderReq } from '@trading-stack/shared-dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { MasterToken } from '../../decorators/master-token.decorator';
import { RequireMasterToken } from '../../decorators/require-master-token.decorator';
import { GetUser } from '../../decorators/user.decorator';
import { User } from '../users/user.entity';

@Controller('futures')
@UseGuards(JwtAuthGuard)
export class FuturesController {
  constructor(private readonly binanceService: BinanceService) {}

  @Get('account-info')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async getFuturesAccountInfo(
    @GetUser() user: User,
    @MasterToken() masterToken: string,
  ) {
    return this.binanceService.getFuturesAccountInfo(user.id, masterToken);
  }

  @Post('positions')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async placePosition(
    @MasterToken() masterToken: string,
    @Body() body: any,
    @GetUser() user: User,
  ) {
    if (!body.symbol) {
      return { ok: false, message: 'Missing parameters' };
    }
    return this.binanceService.placeFuturesPosition(user.id, body, masterToken);
  }

  @Get('positions')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async getPositions(
    @MasterToken() masterToken: string,
    @GetUser() user: User,
  ) {
    return this.binanceService.getPositions(user.id, masterToken);
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async getOrders(@MasterToken() masterToken: string, @GetUser() user: User) {
    return this.binanceService.getOrders(user.id, masterToken);
  }

  @Get('algo-orders')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async getAlgoOrders(@MasterToken() masterToken: string, @GetUser() user: User) {
    return this.binanceService.getAlgoOrders(user.id, masterToken);
  }

  @Post('orders/take-profit')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async takeProfit(
    @MasterToken() masterToken: string,
    @GetUser() user: User,
    @Body() body: SetOrderReq,
  ) {
    return this.binanceService.placeTP({
      symbol: body.symbol,
      price: body.price,
      quantity: body.quantity,
      direction: body.direction,
      userId: user.id,
      masterToken,
    });
  }

  @Post('orders/stop-loss')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async stopLoss(
    @MasterToken() masterToken: string,
    @GetUser() user: User,
    @Body() body: SetOrderReq,
  ) {
    return this.binanceService.placeSL({
      symbol: body.symbol,
      price: body.price,
      quantity: body.quantity,
      direction: body.direction,
      userId: user.id,
      masterToken,
    });
  }

  @Delete('positions/:symbol')
  @RequireMasterToken()
  async closePosition(
    @Param() params: FindOneSymbolDto,
    @MasterToken() masterToken: string,
    @GetUser() user: User,
  ) {
    return this.binanceService.closePosition(
      user.id,
      masterToken,
      params.symbol,
    );
  }
}
