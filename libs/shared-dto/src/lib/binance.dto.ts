import { IsNotEmpty, IsString } from 'class-validator';

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

export class AlgoOrder {
  algoId?: number | bigint;
  clientAlgoId?: string;
  algoType?: string;
  orderType?: string;
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
