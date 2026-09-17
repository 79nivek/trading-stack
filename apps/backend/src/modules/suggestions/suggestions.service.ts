import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { TokenSuggestionDto } from '@trading-stack/shared-dto';

@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name);
  private readonly BASE_URL = 'https://fapi.binance.com/fapi/v1';

  async getFuturesSuggestions(limit: number = 10): Promise<TokenSuggestionDto[]> {
    try {
      // 1. Fetch 24hr ticker data (Liquidity, Volatility, Trade Count)
      const tickerRes = await axios.get(`${this.BASE_URL}/ticker/24hr`);
      const tickers = tickerRes.data;

      // 2. Fetch Premium Index (Funding Rate, Mark Price)
      const premiumRes = await axios.get(`${this.BASE_URL}/premiumIndex`);
      const premiumData = premiumRes.data;

      const premiumMap = new Map<string, any>();
      premiumData.forEach((p: any) => premiumMap.set(p.symbol, p));

      let candidates: TokenSuggestionDto[] = [];

      for (const t of tickers) {
        // Only trade USDT pairs, exclude stablecoin pairs or weird tokens
        if (!t.symbol.endsWith('USDT') || t.symbol === 'USDCUSDT' || t.symbol === 'BUSDUSDT') {
          continue;
        }

        const p = premiumMap.get(t.symbol);
        if (!p) continue;

        const volume24h = parseFloat(t.quoteVolume);
        const priceChangePercent = parseFloat(t.priceChangePercent);
        const tradeCount = parseInt(t.count, 10);
        const fundingRate = parseFloat(p.lastFundingRate);

        // Basic liquidity filter (e.g., > 10M USDT volume in 24h)
        if (volume24h < 10000000) continue;

        // Calculate a quantitative score for day trading suitability
        // High liquidity (log scale), high volatility (absolute), high trade count
        const volScore = Math.abs(priceChangePercent) * 2; // Weight volatility
        const liqScore = Math.log10(volume24h) * 5; // Weight liquidity logarithmically
        const activityScore = Math.log10(tradeCount) * 2;
        
        // High absolute funding rate can mean strong trend or mean reversion opportunity
        const fundingScore = Math.abs(fundingRate) * 1000; 

        const score = volScore + liqScore + activityScore + fundingScore;

        // Generate reasoning like a quant
        let reason = '';
        let action: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';

        if (fundingRate > 0.001 && priceChangePercent < 0) {
          reason = `Extremely high funding rate (${(fundingRate * 100).toFixed(3)}%) with negative momentum. Longs are paying shorts, indicating an overcrowded long side. Potential mean reversion short opportunity.`;
          action = 'SHORT';
        } else if (fundingRate < -0.001 && priceChangePercent > 0) {
          reason = `Deeply negative funding rate (${(fundingRate * 100).toFixed(3)}%) with positive momentum. Shorts are trapped and paying longs. Strong short squeeze potential.`;
          action = 'LONG';
        } else if (priceChangePercent > 10 && volume24h > 100000000) {
          reason = `High momentum and deep liquidity. Strong upward trend with ${priceChangePercent}% price action and deep order book depth. Momentum favors continuation.`;
          action = 'LONG';
        } else if (priceChangePercent < -10 && volume24h > 100000000) {
          reason = `High downside momentum and deep liquidity. Strong downward trend with ${priceChangePercent}% price action. Momentum favors short continuation.`;
          action = 'SHORT';
        } else if (Math.abs(fundingRate) > 0.001) {
          reason = `Anomalous funding rate (${(fundingRate * 100).toFixed(3)}%). Potential mean reversion or heavy skew in open interest.`;
          action = fundingRate > 0 ? 'SHORT' : 'LONG';
        } else if (tradeCount > 500000) {
          reason = `Exceptional market activity and open interest turnover. Great for scalping due to tight spreads and high fill rate.`;
          action = priceChangePercent > 0 ? 'LONG' : 'SHORT';
        } else {
          reason = `Solid baseline liquidity with balanced volatility. Adequate maintenance margin tiers for standard leverage trading.`;
          action = 'NEUTRAL';
        }

        candidates.push({
          symbol: t.symbol,
          volume24h,
          priceChangePercent,
          fundingRate,
          tradeCount,
          reason,
          action,
          score,
        });
      }

      // Sort by score descending
      candidates.sort((a, b) => b.score - a.score);

      // Return top N
      return candidates.slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to fetch suggestions', error);
      throw error;
    }
  }
}
