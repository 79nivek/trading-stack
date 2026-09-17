export interface TokenSuggestionDto {
  symbol: string;
  volume24h: number;
  priceChangePercent: number;
  fundingRate: number;
  tradeCount: number;
  reason: string;
  action: 'LONG' | 'SHORT' | 'NEUTRAL';
  score: number;
}
