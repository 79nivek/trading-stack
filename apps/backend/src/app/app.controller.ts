import { Controller, Get, Param, Post, Delete, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { BinanceFuturesExecutionService } from '../modules/binance-execution/binance-execution.service';
import { FuturesScannerService } from '../modules/futures-scanner/futures-scanner.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly binanceService: BinanceFuturesExecutionService,
    private readonly scannerService: FuturesScannerService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('account/balance')
  async getBalance() {
    const available = await this.binanceService.getAvailableBalance();
    const total = await this.binanceService.getTotalWalletBalance();
    return { available, total };
  }

  @Get('positions')
  async getPositions() {
    return this.binanceService.getOpenPositions();
  }

  @Post('positions/:symbol/close')
  async closePosition(@Param('symbol') symbol: string) {
    return this.binanceService.closePosition(symbol);
  }



  @Delete('positions/:symbol/order/:id')
  async removeOrderById(@Param('symbol') symbol: string, @Param('id') id: string) {
    return this.binanceService.cancelOrderById(symbol, id);
  }

  @Delete('positions/:symbol/tp')
  async removeTakeProfit(@Param('symbol') symbol: string) {
    return this.binanceService.cancelTP(symbol);
  }

  @Delete('positions/:symbol/sl')
  async removeStopLoss(@Param('symbol') symbol: string) {
    return this.binanceService.cancelSL(symbol);
  }

  @Post('positions/:symbol/tp')
  async setTakeProfit(
    @Param('symbol') symbol: string,
    @Body('price') price: number,
  ) {
    const positions = await this.binanceService.getOpenPositions();
    const pos = positions.find((p) => p.symbol === symbol);
    if (!pos || pos.positionAmt === 0) throw new Error('No open position');
    const side = pos.positionAmt > 0 ? 'SELL' : 'BUY';
    const rules = await this.binanceService.getSymbolTradeRules(symbol);
    const triggerPrice = this.binanceService.roundToTickSize(price, rules.tickSize);
    return this.binanceService.placeTakeProfitMarket(symbol, side, triggerPrice, Math.abs(pos.positionAmt));
  }


  @Post('positions/:symbol/trailing-stop')
  async setTrailingStop(
    @Param('symbol') symbol: string,
    @Body('callbackRate') callbackRate: number,
    @Body('activatePrice') activatePrice?: number,
  ) {
    const positions = await this.binanceService.getOpenPositions();
    const pos = positions.find((p) => p.symbol === symbol);
    if (!pos || pos.positionAmt === 0) throw new Error('No open position');
    const side = pos.positionAmt > 0 ? 'SELL' : 'BUY';

    // callbackRate must be between 0.1 and 5 (in %) according to Binance, but let the service handle it or Binance API validate it.

    let parsedActivatePrice = undefined;
    if (activatePrice) {
      const rules = await this.binanceService.getSymbolTradeRules(symbol);
      parsedActivatePrice = this.binanceService.roundToTickSize(activatePrice, rules.tickSize);
    }

    return this.binanceService.placeTrailingStop(
      symbol,
      side,
      callbackRate,
      Math.abs(pos.positionAmt),
      parsedActivatePrice
    );
  }

  @Post('positions/:symbol/sl')
  async setStopLoss(
    @Param('symbol') symbol: string,
    @Body('price') price: number,
  ) {
    const positions = await this.binanceService.getOpenPositions();
    const pos = positions.find((p) => p.symbol === symbol);
    if (!pos || pos.positionAmt === 0) throw new Error('No open position');
    const side = pos.positionAmt > 0 ? 'SELL' : 'BUY';
    const rules = await this.binanceService.getSymbolTradeRules(symbol);
    const triggerPrice = this.binanceService.roundToTickSize(price, rules.tickSize);
    return this.binanceService.placeStopMarket(symbol, side, triggerPrice, Math.abs(pos.positionAmt));
  }


  @Post('positions/:symbol/place-order')
  async placeOrder(
    @Param('symbol') symbol: string,
    @Body('price') price: number,
    @Body('side') side: 'BUY' | 'SELL',
    @Body('marginUSDT') marginUSDT: number,
    @Body('leverage') leverage: number
  ) {
    if (leverage > 0) {
      await this.binanceService.changeLeverage(symbol, leverage);
    }
    const rules = await this.binanceService.getSymbolTradeRules(symbol);
    const notional = marginUSDT * leverage;
    const quantity = notional / price;
    const orderQty = this.binanceService.roundToStepSize(quantity, rules.stepSize);
    const orderPrice = this.binanceService.roundToTickSize(price, rules.tickSize);
    return this.binanceService.placeLimitOrder(symbol, side, orderPrice, orderQty, false);
  }

  @Get('suggestions')
  async getSuggestions() {
    return this.scannerService.scanTopOpportunities();
  }
}
