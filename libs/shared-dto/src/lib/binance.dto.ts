import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Direction } from './shared-dto';

export enum OrderType {
  /**
   * stop market order
   */
  STOP_MARKET = 'STOP_MARKET',
  /**
   * stop limit order
   */
  STOP_LIMIT = 'STOP',
  /**
   * take profit market order
   */
  TAKE_PROFIT_MARKET = 'TAKE_PROFIT_MARKET',
  /**
   * take profit limit order
   */
  TAKE_PROFIT_LIMIT = 'TAKE_PROFIT',

  /**
   * trailing stop market order
   */
  TRAILING_STOP_MARKET = 'TRAILING_STOP_MARKET',
}

export class CheckBinanceCredentialsDto {
  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsString()
  @IsNotEmpty()
  secretKey!: string;
}

export class SaveBinanceCredentialsDto {
  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsString()
  @IsNotEmpty()
  secretKey!: string;
}

// ============== Response Object ============== //

export class Position {
  symbol!: string;
  positionSide!: string;
  positionAmt!: string;
  entryPrice!: string;
  breakEvenPrice!: string;
  markPrice!: string;
  unRealizedProfit!: string;
  liquidationPrice!: string;
  isolatedMargin!: string;
  notional!: string;
  marginAsset!: string;
  isolatedWallet!: string;
  initialMargin!: string;
  maintMargin!: string;
  positionInitialMargin!: string;
  openOrderInitialMargin!: string;
  adl!: number;
  bidNotional!: string;
  askNotional!: string;
  updateTime!: number;

  constructor(params: any) {
    Object.assign(this, params);
  }
}

// ========== Order

export class AlgoOrder {
  algoId?: number | bigint;
  clientAlgoId?: string;
  algoType?: string;
  orderType?: OrderType;
  symbol?: string;
  side?: string;
  positionSide?: string;
  timeInForce?: string;
  quantity?: string;
  algoStatus?: string;
  actualOrderId?: string;
  actualPrice?: string;
  triggerPrice?: string;
  price?: string;
  icebergQuantity?: string;
  tpTriggerPrice?: string;
  tpPrice?: string;
  slTriggerPrice?: string;
  slPrice?: string;
  tpOrderType?: string;
  selfTradePreventionMode?: string;
  workingType?: string;
  priceMatch?: string;
  closePosition?: boolean;
  priceProtect?: boolean;
  reduceOnly?: boolean;
  createTime?: number | bigint;
  updateTime?: number | bigint;
  triggerTime?: number | bigint;
  goodTillDate?: number | bigint;

  activatePrice?: string;

  constructor(params: any) {
    Object.assign(this, params);
  }
}

export class Order {
  avgPrice?: string;
  clientOrderId?: string;
  cumQuote?: string;
  executedQty?: string;
  orderId?: number | bigint;
  origQty?: string;
  origType?: string;
  price?: string;
  reduceOnly?: boolean;
  side?: string;
  positionSide?: string;
  status?: string;
  stopPrice?: string;
  closePosition?: boolean;
  symbol?: string;
  time?: number | bigint;
  timeInForce?: string;
  type?: string;
  activatePrice?: string;
  priceRate?: string;
  updateTime?: number | bigint;
  workingType?: string;
  priceProtect?: boolean;
  priceMatch?: string;
  selfTradePreventionMode?: string;
  goodTillDate?: number | bigint;

  constructor(params: any) {
    Object.assign(this, params);
  }
}

export class AccountInfoResponse {
  futureBalance!: number;
  unrealizedPnl!: number;
  realizedPnlToday!: number;
}

export class SetOrderReq {
  @IsNotEmpty()
  @IsString()
  symbol!: string;

  @IsNotEmpty()
  @IsNumber()
  price!: string;

  @IsNotEmpty()
  @IsString()
  direction!: Direction;

  @IsNotEmpty()
  @IsString()
  quantity!: string;
}
