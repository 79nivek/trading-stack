import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FuturesTradeService } from '../futures-trade/futures-trade.service';
import { ConfigService } from '@nestjs/config';
import { DerivativesTradingUsdsFutures } from '@binance/derivatives-trading-usds-futures';

// Interface for parsed position info
export interface ParsedPosition {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  marginType: string;
  takeProfit?: number;
  stopLoss?: number;
  updateTime?: number;
}

// Interface for symbol trading rules
export interface SymbolTradeRules {
  symbol: string;
  stepSize: number; // qty precision
  tickSize: number; // price precision
  minQty: number;
  minNotional: number;
}

@Injectable()
export class BinanceFuturesExecutionService implements OnModuleInit {
  private readonly logger = new Logger(BinanceFuturesExecutionService.name);
  private futuresClient!: DerivativesTradingUsdsFutures;
  private symbolRulesCache = new Map<string, SymbolTradeRules>();

  constructor(
    private readonly configService: ConfigService,
    private readonly futuresTradeService: FuturesTradeService
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('BINANCE_API_KEY') || '';
    const privateKey = (
      this.configService.get<string>('BINANCE_PRIVATE_KEY') || ''
    ).replace(/\\n/g, '\n');
    this.futuresClient = new DerivativesTradingUsdsFutures({
      configurationRestAPI: { apiKey, privateKey },
    });
  }

  // --- Setup methods ---
  async changeMarginType(
    symbol: string,
    marginType: 'ISOLATED' | 'CROSSED',
  ): Promise<void> {
    try {
      await this.futuresClient.restAPI.changeMarginType({
        symbol,
        marginType: marginType as any,
      });
      this.logger.log(`[${symbol}] Margin type → ${marginType}`);
    } catch (err: any) {
      // Error code -4046 means margin type already set - ignore it
      if (
        err?.code === -4046 ||
        err?.message?.includes('No need to change margin type')
      ) {
        this.logger.log(`[${symbol}] Margin type đã là ${marginType}`);
        return;
      }
      throw err;
    }
  }

  async changeLeverage(symbol: string, leverage: number): Promise<void> {
    const res = await this.futuresClient.restAPI.changeInitialLeverage({
      symbol,
      leverage,
    });
    await res.data();
    this.logger.log(`[${symbol}] Leverage → ${leverage}x`);
  }

  // --- Order placement ---
  async placeMarketOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    reduceOnly = false,
  ): Promise<any> {
    this.logger.log(`[${symbol}] Placing MARKET ${side} qty=${quantity} reduceOnly=${reduceOnly}`);
    const params: any = {
      symbol,
      side: side as any,
      type: 'MARKET' as any,
      quantity,
      newOrderRespType: 'RESULT' as any,
    }
    if (reduceOnly) {
      params.reduceOnly = 'true';
    }
    const res = await this.futuresClient.restAPI.newOrder(params);
    const data = await res.data();
    this.logger.log(`[${symbol}] MARKET order filled: ${JSON.stringify(data)}`);
    return data;
  }

  async placeLimitOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    price: number,
    quantity: number,
    reduceOnly = false,
  ): Promise<any> {
    this.logger.log(
      `[${symbol}] Placing LIMIT ${side} price=${price} qty=${quantity} reduceOnly=${reduceOnly}`,
    );
    const params: any = {
      symbol,
      side: side as any,
      type: 'LIMIT' as any,
      quantity,
      price,
      timeInForce: 'GTC' as any,
    }
    if (reduceOnly) {
      params.reduceOnly = 'true' as any;
    }
    const res = await this.futuresClient.restAPI.newOrder(params);
    const data = await res.data();
    this.logger.log(`[${symbol}] LIMIT order placed: ${JSON.stringify(data)}`);
    return data;
  }

  async placeStopMarket(
    symbol: string,
    side: 'BUY' | 'SELL',
    triggerPrice: number,
    quantity: number,
  ): Promise<any> {
    this.logger.log(
      `[${symbol}] Placing STOP_MARKET ${side} triggerPrice=${triggerPrice} qty=${quantity}`,
    );
    const params: any = {
      algoType: 'CONDITIONAL' as any,
      symbol,
      side: side as any,
      type: 'STOP_MARKET' as any,
      quantity,
      triggerPrice,
      reduceOnly: 'true' as any,
      workingType: 'MARK_PRICE' as any,
    }
    const res = await this.futuresClient.restAPI.newAlgoOrder(params);
    const data = await res.data();
    this.logger.log(
      `[${symbol}] STOP_MARKET placed: ${JSON.stringify(data)}`,
    );
    return data;
  }



  async cancelOrderById(symbol: string, id: string): Promise<void> {
    this.logger.log(`[${symbol}] Attempting to cancel order id=${id}`);

    // Try algo order cancel first (TP/SL are algo orders)
    try {
      const res = await this.futuresClient.restAPI.cancelAlgoOrder({ algoId: BigInt(id) });
      const data = await res.data();
      this.logger.log(`[${symbol}] Cancelled algo order ${id}: ${JSON.stringify(data)}`);
      return;
    } catch (err: any) {
      this.logger.warn(`[${symbol}] cancelAlgoOrder failed for ${id}: ${err?.message || err}`);
    }

    // Fallback: try normal order cancel
    try {
      const res = await this.futuresClient.restAPI.cancelOrder({ symbol, orderId: parseInt(id, 10) });
      const data = await res.data();
      this.logger.log(`[${symbol}] Cancelled normal order ${id}: ${JSON.stringify(data)}`);
    } catch (err: any) {
      this.logger.error(`[${symbol}] Failed to cancel order ${id} via both algo and normal: ${err?.message || err}`);
      throw err;
    }
  }

  async cancelTP(symbol: string): Promise<void> {
    await this.cancelAlgoOrderType(symbol, 'TAKE_PROFIT');
  }

  async cancelSL(symbol: string): Promise<void> {
    await this.cancelAlgoOrderType(symbol, 'STOP');
  }

  private async cancelAlgoOrderType(symbol: string, typeKeyword: string): Promise<void> {
    const algoRes = this.futuresClient.restAPI.currentAllAlgoOpenOrders ? await this.futuresClient.restAPI.currentAllAlgoOpenOrders({ algoType: 'CONDITIONAL' }) : { data: async () => [] };
    const algoOpenOrders = algoRes.data ? await algoRes.data() : [];
    const orders = Array.isArray(algoOpenOrders) ? algoOpenOrders : (algoOpenOrders && Array.isArray((algoOpenOrders as any).orders) ? (algoOpenOrders as any).orders : []);

    const targets = orders.filter((o: any) =>
      o.symbol === symbol &&
      (o.orderType === typeKeyword || o.orderType === typeKeyword + '_MARKET' || o.type === typeKeyword || o.type === typeKeyword + '_MARKET')
    );
    for (const t of targets) {
      await this.futuresClient.restAPI.cancelAlgoOrder({ algoId: BigInt(t.algoId) });
      this.logger.log(`[${symbol}] Cancelled ${typeKeyword} algo order ${t.algoId}`);
    }
  }

  async placeTakeProfitMarket(
    symbol: string,
    side: 'BUY' | 'SELL',
    triggerPrice: number,
    quantity: number,
  ): Promise<any> {
    this.logger.log(
      `[${symbol}] Placing TAKE_PROFIT_MARKET ${side} triggerPrice=${triggerPrice} qty=${quantity}`,
    );
    const params: any = {
      algoType: 'CONDITIONAL' as any,
      symbol,
      side: side as any,
      type: 'TAKE_PROFIT_MARKET' as any,
      quantity,
      triggerPrice,
      reduceOnly: 'true' as any,
      workingType: 'MARK_PRICE' as any,
    }
    const res = await this.futuresClient.restAPI.newAlgoOrder(params);
    const data = await res.data();
    this.logger.log(`[${symbol}] TAKE_PROFIT_MARKET placed: ${JSON.stringify(data)}`);
    return data;
  }

  async placeTrailingStop(
    symbol: string,
    side: 'BUY' | 'SELL',
    callbackRate: number,
    quantity: number,
    activatePrice?: number,
  ): Promise<any> {
    const params: any = {
      algoType: 'CONDITIONAL' as any,
      symbol,
      side: side as any,
      type: 'TRAILING_STOP_MARKET' as any,
      quantity,
      callbackRate,
      reduceOnly: 'true' as any,
      workingType: 'MARK_PRICE' as any,
    }
    if (activatePrice) {
      params.activatePrice = activatePrice;
    }

    this.logger.log(
      `[${symbol}] Placing TRAILING_STOP_MARKET ${side} params=${JSON.stringify(params)}`,
    );
    const res = await this.futuresClient.restAPI.newAlgoOrder(params);
    const data = await res.data();
    this.logger.log(
      `[${symbol}] TRAILING_STOP placed: ${JSON.stringify(data)}`,
    );
    return data;
  }

  // --- Query methods ---
  async closePosition(symbol: string): Promise<any> {
    const positions = await this.getOpenPositions();
    const position = positions.find((p) => p.symbol === symbol);

    if (!position || position.positionAmt === 0) {
      throw new Error(`No open position for ${symbol}`);
    }

    const side = position.positionAmt > 0 ? 'SELL' : 'BUY';
    const quantity = Math.abs(position.positionAmt);

    this.logger.log(`[${symbol}] Closing position via market ${side} for ${quantity}`);
    const orderRes = await this.placeMarketOrder(symbol, side, quantity, true);

    // Save trade to DB
    const avgPrice = parseFloat(orderRes.avgPrice || orderRes.price || '0');
    try {
      await this.futuresTradeService.saveTrade({
        symbol,
        side,
        price: avgPrice,
        exitPrice: avgPrice,
        qty: quantity,
        fee: 0,
        realizedPnl: 0,
        timestamp: new Date()
      });
      this.logger.log(`[${symbol}] Saved exit trade to DB with price ${avgPrice}`);
    } catch (err) {
      this.logger.error(`[${symbol}] Failed to save exit trade to DB: ${err}`);
    }

    return orderRes;
  }

  async getOpenPositions(): Promise<ParsedPosition[]> {
    const [posRes, ordersRes, algoOrdersRes] = await Promise.all([
      this.futuresClient.restAPI.positionInformationV2(),
      this.futuresClient.restAPI.currentAllOpenOrders(),
      this.futuresClient.restAPI.currentAllAlgoOpenOrders ? this.futuresClient.restAPI.currentAllAlgoOpenOrders({ algoType: 'CONDITIONAL' }) : Promise.resolve({ data: () => [] }),
    ]);

    const positions = await posRes.data();
    this.logger.debug(`RAW POSITION 0: ${JSON.stringify(positions[0])}`);
    const openOrders = await ordersRes.data();
    const algoOpenOrders = algoOrdersRes.data ? await algoOrdersRes.data() : [];
    const extractedAlgo = Array.isArray(algoOpenOrders) ? algoOpenOrders : (algoOpenOrders && Array.isArray((algoOpenOrders as any).orders) ? (algoOpenOrders as any).orders : []);
    const allOrders = [...openOrders, ...extractedAlgo];
    this.logger.debug(`ALGO ORDERS EXTRACTED: ${JSON.stringify(extractedAlgo)}`);

    const result = positions
      .filter((p: any) => parseFloat(p.positionAmt || 0) !== 0)
      .map((p: any) => {
        const amt = parseFloat(p.positionAmt || 0);
        // Tìm lệnh TP/SL liên quan đến symbol này
        // SL thường là STOP_MARKET, TP thường là TAKE_PROFIT_MARKET
        const symbolOrders = allOrders.filter((o: any) => o.symbol === p.symbol);

        let stopLoss = undefined;
        let takeProfit = undefined;
        const stopLosses: { id: string, price: number }[] = [];
        const takeProfits: { id: string, price: number }[] = [];
        const trailingStops: { id: string, activatePrice?: number, callbackRate: number, stopPrice?: number }[] = [];

        symbolOrders.forEach((o: any) => {
          // In One-Way mode, an order that is opposite to the position is a closing order (TP/SL)
          const isOpposite = (amt > 0 && o.side === 'SELL') || (amt < 0 && o.side === 'BUY');
          const isClosing = o.reduceOnly === true || o.reduceOnly === 'true' || o.closePosition === true || o.closePosition === 'true' || isOpposite;

          const orderType = o.type || o.orderType;
          if ((orderType === 'STOP_MARKET' || orderType === 'STOP') && isClosing) {
            stopLoss = parseFloat(o.stopPrice || o.triggerPrice || 0);
            stopLosses.push({ id: (o.algoId || o.orderId || '').toString(), price: stopLoss });
          }
          if ((orderType === 'TAKE_PROFIT_MARKET' || orderType === 'TAKE_PROFIT') && isClosing) {
            takeProfit = parseFloat(o.stopPrice || o.triggerPrice || 0);
            takeProfits.push({ id: (o.algoId || o.orderId || '').toString(), price: takeProfit });
          }
          if (orderType === 'TRAILING_STOP_MARKET' && isClosing) {
            trailingStops.push({ 
              id: (o.algoId || o.orderId || '').toString(), 
              activatePrice: o.activatePrice ? parseFloat(o.activatePrice) : undefined,
              callbackRate: parseFloat(o.callbackRate || 0),
              stopPrice: parseFloat(o.stopPrice || o.triggerPrice || 0)
            });
          }
        });

        return {
          symbol: p.symbol,
          positionAmt: amt,
          entryPrice: parseFloat(p.entryPrice || 0),
          markPrice: parseFloat(p.markPrice || 0),
          liquidationPrice: parseFloat(p.liquidationPrice || '0'),
          unrealizedPnl: parseFloat(p.unrealizedProfit || p.unRealizedProfit || '0'),
          leverage: parseInt(p.leverage, 10),
          marginType: p.marginType,
          stopLoss,
          takeProfit,
          stopLosses,
          takeProfits,
          trailingStops,
          updateTime: p.updateTime ? Number(p.updateTime) : undefined,
        }
      });

    // Calculate fees based on notional value (Binance Futures taker fee = 0.05%)
    const TAKER_FEE_RATE = 0.0005;
    const positionsWithFees = result.map((pos) => {
      const notional = Math.abs(pos.positionAmt) * pos.entryPrice;
      const entryFee = notional * TAKER_FEE_RATE;
      const exitNotional = Math.abs(pos.positionAmt) * pos.markPrice;
      const estimatedCloseFee = exitNotional * TAKER_FEE_RATE;
      const totalFee = entryFee + estimatedCloseFee;
      return {
        ...pos,
        totalFee,
        estimatedCloseFee,
        netPnl: pos.unrealizedPnl - totalFee,
      };
    });

    return positionsWithFees;
  }

  async getAvailableBalance(): Promise<number> {
    const res = await this.futuresClient.restAPI.futuresAccountBalanceV3();
    const balances: any[] = (await res.data()) as any;
    const usdtBalance = balances.find((b: any) => b.asset === 'USDT');
    return usdtBalance
      ? parseFloat(usdtBalance.availableBalance || usdtBalance.balance || '0')
      : 0;
  }

  async getTotalWalletBalance(): Promise<number> {
    const res = await this.futuresClient.restAPI.futuresAccountBalanceV3();
    const balances: any[] = (await res.data()) as any;
    const usdtBalance = balances.find((b: any) => b.asset === 'USDT');
    // .balance is the total wallet balance including locked margin
    return usdtBalance ? parseFloat(usdtBalance.balance || '0') : 0;
  }

  async getAccountTradeList(symbol: string, limit = 10): Promise<any[]> {
    const res = await this.futuresClient.restAPI.accountTradeList({
      symbol,
      limit,
    });
    return (await res.data()) as any;
  }

  async getSymbolTradeRules(symbol: string): Promise<SymbolTradeRules> {
    // Check cache first
    if (this.symbolRulesCache.has(symbol)) {
      return this.symbolRulesCache.get(symbol)!;
    }

    const res = await this.futuresClient.restAPI.exchangeInformation();
    const info: any = await res.data();
    const symbolInfo = (info.symbols || []).find(
      (s: any) => s.symbol === symbol,
    );
    if (!symbolInfo)
      throw new Error(`Symbol ${symbol} not found in exchange info`);

    const lotSizeFilter = symbolInfo.filters.find(
      (f: any) => f.filterType === 'LOT_SIZE',
    );
    const priceFilter = symbolInfo.filters.find(
      (f: any) => f.filterType === 'PRICE_FILTER',
    );
    const minNotionalFilter = symbolInfo.filters.find(
      (f: any) => f.filterType === 'MIN_NOTIONAL',
    );

    const rules: SymbolTradeRules = {
      symbol,
      stepSize: parseFloat(lotSizeFilter?.stepSize || '0.001'),
      tickSize: parseFloat(priceFilter?.tickSize || '0.01'),
      minQty: parseFloat(lotSizeFilter?.minQty || '0.001'),
      minNotional: parseFloat(minNotionalFilter?.notional || '5'),
    }

    this.symbolRulesCache.set(symbol, rules);
    return rules;
  }

  async cancelAllOpenOrders(symbol: string): Promise<void> {
    try {
      // Cancel regular orders
      await this.futuresClient.restAPI
        .cancelAllOpenOrders({ symbol })
        .catch((err: any) => {
          this.logger.error(
            `[${symbol}] Cancel orders: ${JSON.stringify(err)}`,
          );
        });
      // Cancel algo orders (STOP_MARKET, TRAILING_STOP_MARKET, etc)
      await this.futuresClient.restAPI.cancelAllAlgoOpenOrders({ symbol });
      this.logger.log(`[${symbol}] All open orders (regular & algo) cancelled`);
    } catch (err: any) {
      this.logger.warn(`[${symbol}] Cancel orders: ${err.message}`);
    }
  }

  async cancelAllAlgoOrders(symbol: string): Promise<void> {
    try {
      await this.futuresClient.restAPI.cancelAllAlgoOpenOrders({ symbol });
      this.logger.log(`[${symbol}] All ALGO orders (Stop Loss/Trailing) cancelled`);
    } catch (err: any) {
      this.logger.warn(`[${symbol}] Cancel algo orders: ${err.message}`);
    }
  }

  // --- Utility ---
  roundToStepSize(value: number, stepSize: number): number {
    const precision = Math.max(0, Math.round(-Math.log10(stepSize)));
    return parseFloat(
      (Math.floor(value / stepSize) * stepSize).toFixed(precision),
    );
  }

  roundToTickSize(value: number, tickSize: number): number {
    const precision = Math.max(0, Math.round(-Math.log10(tickSize)));
    return parseFloat(
      (Math.round(value / tickSize) * tickSize).toFixed(precision),
    );
  }
}
