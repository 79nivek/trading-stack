import { Direction } from "./shared-dto";

export interface QuantAnalyzeResponseDto {
  symbol: string;
  volume24h: number;
  priceChangePercent: number;
  fundingRate: number;
  tradeCount: number;
  reason: string;
  action: Direction;
  score: number;
}
