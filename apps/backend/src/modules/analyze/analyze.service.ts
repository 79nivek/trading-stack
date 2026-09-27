import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';
import {
  Direction,
  PremiumIndex,
  QuantAnalyzeResponseDto,
  Ticker24h,
} from '@trading-stack/shared-dto';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);

  constructor(
    private marketDataService: MarketDataService,
    private userSettingServ: UserSettingsService,
    private llmService: LlmService,
  ) {}

  async quantitative(
    symbol: string,
    ticker24hData?: Ticker24h,
    premiumData?: PremiumIndex,
  ): Promise<QuantAnalyzeResponseDto> {
    if (!ticker24hData || !premiumData) {
      const [t, p] = await Promise.all([
        this.marketDataService.fetch24hTickerData(),
        this.marketDataService.fetchPremiumIndex(),
      ]);

      ticker24hData = t.get(symbol);
      premiumData = p.get(symbol);

      if (!ticker24hData || !premiumData) {
        throw new NotFoundException('Ticker data not found');
      }
    }

    const volume24h = parseFloat(ticker24hData.quoteVolume);
    const priceChangePercent = parseFloat(ticker24hData.priceChangePercent);
    const tradeCount = ticker24hData.count;
    const fundingRate = parseFloat(premiumData.lastFundingRate);

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
    let action: Direction = Direction.NEUTRAL;

    if (fundingRate > 0.001 && priceChangePercent < 0) {
      reason = `Extremely high funding rate (${(fundingRate * 100).toFixed(3)}%) with negative momentum. Longs are paying shorts, indicating an overcrowded long side. Potential mean reversion short opportunity.`;
      action = Direction.SHORT;
    } else if (fundingRate < -0.001 && priceChangePercent > 0) {
      reason = `Deeply negative funding rate (${(fundingRate * 100).toFixed(3)}%) with positive momentum. Shorts are trapped and paying longs. Strong short squeeze potential.`;
      action = Direction.LONG;
    } else if (priceChangePercent > 10 && volume24h > 100000000) {
      reason = `High momentum and deep liquidity. Strong upward trend with ${priceChangePercent}% price action and deep order book depth. Momentum favors continuation.`;
      action = Direction.LONG;
    } else if (priceChangePercent < -10 && volume24h > 100000000) {
      reason = `High downside momentum and deep liquidity. Strong downward trend with ${priceChangePercent}% price action. Momentum favors short continuation.`;
      action = Direction.SHORT;
    } else if (Math.abs(fundingRate) > 0.001) {
      reason = `Anomalous funding rate (${(fundingRate * 100).toFixed(3)}%). Potential mean reversion or heavy skew in open interest.`;
      action = fundingRate > 0 ? Direction.SHORT : Direction.LONG;
    } else if (tradeCount > 500000) {
      reason = `Exceptional market activity and open interest turnover. Great for scalping due to tight spreads and high fill rate.`;
      action = priceChangePercent > 0 ? Direction.LONG : Direction.SHORT;
    } else {
      reason = `Solid baseline liquidity with balanced volatility. Adequate maintenance margin tiers for standard leverage trading.`;
      action = Direction.NEUTRAL;
    }

    return {
      symbol,
      volume24h,
      priceChangePercent,
      fundingRate,
      tradeCount,
      reason,
      action,
      score,
    };
  }

  async llm(symbol: string, userId: string) {
    const userSetting = await this.userSettingServ.getSettings(userId);
    if (!userSetting) {
      throw new NotFoundException('User settings not found');
    }

    const timeFrame = userSetting.timeFrame;

    const llmRes = await this.llmService.analyze(symbol, timeFrame);

    return llmRes;
  }
}
