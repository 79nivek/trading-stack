import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { TokenSuggestionDto, PositionSetupDto, Direction, EntryType } from '@trading-stack/shared-dto';
import { EMA, MACD, ATR, BollingerBands, RSI } from 'technicalindicators';

@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name);
  private readonly BASE_URL = 'https://fapi.binance.com/fapi/v1';

  async getFuturesSuggestions(limit = 10): Promise<TokenSuggestionDto[]> {
    try {
      // 1. Fetch 24hr ticker data (Liquidity, Volatility, Trade Count)
      const tickerRes = await axios.get(`${this.BASE_URL}/ticker/24hr`);
      const tickers = tickerRes.data;

      // 2. Fetch Premium Index (Funding Rate, Mark Price)
      const premiumRes = await axios.get(`${this.BASE_URL}/premiumIndex`);
      const premiumData = premiumRes.data;

      const premiumMap = new Map<string, any>();
      premiumData.forEach((p: any) => premiumMap.set(p.symbol, p));

      const candidates: TokenSuggestionDto[] = [];

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

  async quantPosition(symbol: string, balance: number): Promise<PositionSetupDto[]> {
    try {
      const klinesRes = await axios.get(`${this.BASE_URL}/klines?symbol=${symbol}&interval=4h&limit=250`);
      const klines = klinesRes.data;

      const highs = klines.map((k: any) => parseFloat(k[2]));
      const lows = klines.map((k: any) => parseFloat(k[3]));
      const closes = klines.map((k: any) => parseFloat(k[4]));
      const currentPrice = closes[closes.length - 1];

      const atrResult = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
      const currentAtr = atrResult.length > 0 ? atrResult[atrResult.length - 1] : (currentPrice * 0.05);

      const ema200Result = EMA.calculate({ values: closes, period: 200 });
      const currentEma200 = ema200Result.length > 0 ? ema200Result[ema200Result.length - 1] : currentPrice;

      const macdResult = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
      const currentMacd = macdResult.length > 0 ? macdResult[macdResult.length - 1] : { MACD: 0, signal: 0, histogram: 0 };

      const bbResult = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
      const currentBb = bbResult.length > 0 ? bbResult[bbResult.length - 1] : { upper: currentPrice * 1.05, middle: currentPrice, lower: currentPrice * 0.95 };

      const rsiResult = RSI.calculate({ values: closes, period: 14 });
      const currentRsi = rsiResult.length > 0 ? rsiResult[rsiResult.length - 1] : 50;

      const riskPerTrade = balance * 0.02; // Risk 2% of balance

      // Helper to guarantee Binance min notional > $5 (we use 6 to be safe)
      const enforceMinNotional = (setup: PositionSetupDto, price: number) => {
        if (setup.direction !== 'NEUTRAL' && setup.volume > 0) {
          if (setup.volume * price < 6) {
            setup.volume = 6 / price;
            setup.margin = 6 / setup.leverage;
            setup.estimatedLoss = setup.volume * Math.abs(price - setup.stopLossPrice);
            setup.estimatedProfit = setup.volume * Math.abs(price - setup.takeProfitPrice);
            setup.reasoning += ' (Volume bumped to meet Binance $5 notional min)';
          }
        }
      };

      const results: PositionSetupDto[] = [];

      // Algorithm 1: Trend-Momentum
      let trendDir: Direction = Direction.NEUTRAL;
      if (currentPrice > currentEma200 && currentMacd.MACD! > currentMacd.signal!) {
        trendDir = Direction.LONG;
      } else if (currentPrice < currentEma200 && currentMacd.MACD! < currentMacd.signal!) {
        trendDir = Direction.SHORT;
      }

      const trendSlDistance = 1.5 * currentAtr;
      const trendSl = trendDir === Direction.LONG ? currentPrice - trendSlDistance : currentPrice + trendSlDistance;
      const trendTp = trendDir === Direction.LONG ? currentPrice + (trendSlDistance * 2) : currentPrice - (trendSlDistance * 2);
      const trendVolume = trendDir !== Direction.NEUTRAL ? riskPerTrade / trendSlDistance : 0;
      const trendMargin = (trendVolume * currentPrice) / 10; // Assuming 10x leverage for calculation

      const trendSetup: PositionSetupDto = {
        strategyName: 'Trend-Momentum',
        direction: trendDir,
        leverage: 10,
        margin: trendMargin,
        volume: trendVolume,
        entryType: EntryType.MARKET,
        entryPrice: currentPrice,
        takeProfitPrice: trendTp,
        stopLossPrice: trendSl,
        estimatedProfit: riskPerTrade * 2,
        estimatedLoss: riskPerTrade,
        reasoning: `EMA200 ${currentPrice > currentEma200 ? 'Bullish' : 'Bearish'} filter + MACD Momentum. Risking 2% of balance with 1.5 ATR trailing stop.`
      };
      enforceMinNotional(trendSetup, currentPrice);
      results.push(trendSetup);

      // Algorithm 2: Mean-Reversion
      let meanDir: Direction = Direction.NEUTRAL;
      if (currentPrice <= currentBb.lower && currentRsi < 30) {
        meanDir = Direction.LONG;
      } else if (currentPrice >= currentBb.upper && currentRsi > 70) {
        meanDir = Direction.SHORT;
      } else {
        meanDir = Direction.NEUTRAL; // Too risky to force a trade if not at bands
      }

      const meanSlDistance = currentAtr * 0.5;
      const meanSl = meanDir === Direction.LONG ? currentPrice - meanSlDistance : currentPrice + meanSlDistance;
      const meanTp = currentBb.middle;
      const meanRisk = Math.abs(currentPrice - meanSl);
      const meanVolume = meanDir !== 'NEUTRAL' ? riskPerTrade / meanRisk : 0;
      const meanMargin = (meanVolume * currentPrice) / 20; // 20x leverage for tight ranges

      const meanSetup: PositionSetupDto = {
        strategyName: 'Mean-Reversion',
        direction: meanDir,
        leverage: 20,
        margin: meanMargin,
        volume: meanVolume,
        entryType: EntryType.LIMIT,
        entryPrice: currentPrice,
        takeProfitPrice: meanTp,
        stopLossPrice: meanSl,
        estimatedProfit: meanVolume * Math.abs(meanTp - currentPrice),
        estimatedLoss: riskPerTrade,
        reasoning: `Bollinger Bands + RSI extremes. Expecting reversion to the mean (${currentBb.middle.toFixed(4)}).`
      };
      enforceMinNotional(meanSetup, currentPrice);
      results.push(meanSetup);

      // Algorithm 3: Volatility Breakout
      // Simple representation: if bands are tight (squeeze) and we break out
      const bandWidth = (currentBb.upper - currentBb.lower) / currentBb.middle;
      let volDir: Direction = Direction.NEUTRAL;

      // If bandwidth < 5% (tight squeeze) and price breaks 20 SMA
      if (bandWidth < 0.05) {
        if (currentPrice > currentBb.middle) volDir = Direction.LONG;
        else if (currentPrice < currentBb.middle) volDir = Direction.SHORT;
      }

      const volSlDistance = currentAtr;
      const volSl = volDir === Direction.LONG ? currentPrice - volSlDistance : currentPrice + volSlDistance;
      const volTp = volDir === Direction.LONG ? currentPrice + (volSlDistance * 3) : currentPrice - (volSlDistance * 3);
      const volRisk = volSlDistance;
      const volVolume = volDir !== Direction.NEUTRAL ? riskPerTrade / volRisk : 0;
      const volMargin = (volVolume * currentPrice) / 10;

      const volSetup: PositionSetupDto = {
        strategyName: 'Volatility Breakout',
        direction: volDir,
        leverage: 10,
        margin: volMargin,
        volume: volVolume,
        entryType: EntryType.MARKET,
        entryPrice: currentPrice,
        takeProfitPrice: volTp,
        stopLossPrice: volSl,
        estimatedProfit: riskPerTrade * 3,
        estimatedLoss: riskPerTrade,
        reasoning: `Band Squeeze breakout. High Reward/Risk (3:1) with 1x ATR Stop Loss.`
      };
      enforceMinNotional(volSetup, currentPrice);
      results.push(volSetup);

      return results;
    } catch (error) {
      this.logger.error('Failed to calculate quant position', error);
      throw error;
    }
  }
}
