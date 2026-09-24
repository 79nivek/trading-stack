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
}

export class AccountInfoResponse {
  futureBalance!: number;
  unrealizedPnl!: number;
  realizedPnlToday!: number;
  positions!: Position[];
}
