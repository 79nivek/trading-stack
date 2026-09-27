import { Direction, EntryType } from "./shared-dto";

export interface TokenSuggestionDto {
  symbol: string;
  volume24h: number;
  priceChangePercent: number;
  fundingRate: number;
  tradeCount: number;
  reason: string;
  action: Direction;
  score: number;
}

export interface LlmAnalyzeTokenResponseDto {
  symbol: string;
  action: Direction;
  reasoning: string;
}

export interface PositionSetupDto {
  strategyName: string;
  direction: Direction;
  leverage: number;
  margin: number;
  volume: number;
  entryType: EntryType;
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  estimatedProfit: number;
  estimatedLoss: number;
  reasoning: string;
}

export interface SuggestionPositionResponseDto {
  llmSetup: PositionSetupDto;
  quantSetups: PositionSetupDto[];
  balanceNum: number;
}

export interface PlacePositionDto {
  symbol: string;
  direction: Direction;
  leverage: number;
  margin: number;
  volume: number;
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
}
