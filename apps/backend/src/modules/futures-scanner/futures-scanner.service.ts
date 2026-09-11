import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PortfolioValuationService } from '../portfolio-valuation/portfolio-valuation.service';
import { TRADING_CONFIG } from '../../constants/constants';
import { ConfigService } from '@nestjs/config';
import { FuturesTradeService } from '../futures-trade/futures-trade.service';

export interface TokenOpportunity {
  symbol: string;
  volume: number;
  priceChangePercent: number;
  volatility: number;
  fundingRate: number;
  score: number;
  reason: string;
  suggestedAction: string;
  recommendedLeverage: number;
  allocationSize: number;
  takeProfitAmount?: number;
  stopLossAmount?: number;
  maxMarginPercent?: number;
  currentPrice?: number;
  suggestedTpPrice?: number;
  suggestedSlPrice?: number;
  lastExitPrice?: number;
}

@Injectable()
export class FuturesScannerService {
  private readonly logger = new Logger(FuturesScannerService.name);

  constructor(
    private readonly portfolioValuationService: PortfolioValuationService,
    private readonly configService: ConfigService,
    private readonly futuresTradeService: FuturesTradeService
  ) {}

  public async scanTopOpportunities(userCapital?: number): Promise<{ capital: number, tokens: TokenOpportunity[] }> {
    let capital = userCapital;
    if (!capital) {
      // Tự động lấy data capital từ database / account
      const valuation = this.portfolioValuationService.getTotalAssetValue();
      capital = valuation.futures; // Use futures wallet balance
      if (capital < 10) {
        capital = 500; // Fallback to a default if account is too small
      }
    }

    try {
      // 1. Lấy dữ liệu ticker 24h
      const tickerRes = await axios.get('https://fapi.binance.com/fapi/v1/ticker/24hr');
      const tickers: any[] = tickerRes.data;

      // 2. Lấy dữ liệu funding rate
      const fundingRes = await axios.get('https://fapi.binance.com/fapi/v1/premiumIndex');
      const fundings: any[] = fundingRes.data;

      const fundingMap = new Map<string, number>();
      for (const f of fundings) {
        fundingMap.set(f.symbol, parseFloat(f.lastFundingRate));
      }

      // 3. Lọc ra danh sách top thanh khoản để giảm thiểu số lượng API calls (tối đa 20 coin)
      const topLiquidityTickers = tickers
        .filter(t => t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 100000000)
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, 20);

      const opportunities: TokenOpportunity[] = [];

      for (const t of topLiquidityTickers) {
        const symbol = t.symbol;
        const volume = parseFloat(t.quoteVolume);
        const fundingRate = fundingMap.get(symbol) || 0;
        const priceChangePercent = parseFloat(t.priceChangePercent);

        // 4. Phân tích Định lượng (Quantitative Analysis) bằng K-lines (15m)
        let klines: any[] = [];
        try {
          const klineRes = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=50`);
          klines = klineRes.data;
        } catch (err) {
          this.logger.warn(`Lỗi lấy klines cho ${symbol}, skip.`);
          continue;
        }

        if (klines.length < 25) continue;

        // Tính ATR (14)
        const period = 14;
        let sumTr = 0;
        for (let i = 1; i <= period; i++) {
          const high = parseFloat(klines[i][2]);
          const low = parseFloat(klines[i][3]);
          const prevClose = parseFloat(klines[i - 1][4]);
          const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
          sumTr += tr;
        }
        let atr = sumTr / period;
        for (let i = period + 1; i < klines.length; i++) {
          const high = parseFloat(klines[i][2]);
          const low = parseFloat(klines[i][3]);
          const prevClose = parseFloat(klines[i - 1][4]);
          const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
          atr = (atr * (period - 1) + tr) / period;
        }

        // Tính Z-Score (20)
        const zPeriod = 20;
        const closes = klines.slice(-zPeriod).map((k: any) => parseFloat(k[4]));
        const currentClose = closes[closes.length - 1];
        const mean = closes.reduce((a, b) => a + b, 0) / zPeriod;
        const variance = closes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / zPeriod;
        const stdDev = Math.sqrt(variance);
        const zScore = stdDev === 0 ? 0 : (currentClose - mean) / stdDev;

        // Cường độ biến động % (ATR / Close)
        const atrPercent = (atr / currentClose);
        const volatility = atrPercent;

        let score = (atrPercent * 10000) + (Math.abs(zScore) * 10);
        let reason = '';
        let suggestedAction = '';

        // Tự động chọn chiến lược dựa trên Z-Score
        if (zScore > 2.0) {
           score += (fundingRate > 0 ? 30 : 0); // Đỉnh Bollinger, funding rate cao -> Short Mean Reversion
           reason = `Giá vượt biên trên (Z-Score: ${zScore.toFixed(2)}). ATR: ${(atrPercent*100).toFixed(2)}%. Lực bán chốt lời chuẩn bị kích hoạt.`;
           suggestedAction = 'SHORT (Scalp / Mean Reversion)';
        } else if (zScore < -2.0) {
           score += (fundingRate < 0 ? 30 : 0); // Đáy Bollinger, funding rate âm -> Long Mean Reversion
           reason = `Giá rớt khỏi biên dưới (Z-Score: ${zScore.toFixed(2)}). ATR: ${(atrPercent*100).toFixed(2)}%. Khả năng bật hồi cao.`;
           suggestedAction = 'LONG (Bắt đáy / Mean Reversion)';
        } else if (zScore > 1.0 && priceChangePercent > 3) {
           reason = `Xu hướng TĂNG Momentum (Z-Score: ${zScore.toFixed(2)}). Volatility: ${(atrPercent*100).toFixed(2)}%.`;
           suggestedAction = 'LONG (Thuận xu hướng)';
        } else if (zScore < -1.0 && priceChangePercent < -3) {
           reason = `Xu hướng GIẢM Momentum (Z-Score: ${zScore.toFixed(2)}). Volatility: ${(atrPercent*100).toFixed(2)}%.`;
           suggestedAction = 'SHORT (Thuận xu hướng)';
        } else {
           score -= 50;
           reason = `Đi ngang (Z-Score: ${zScore.toFixed(2)}), chưa có setup rõ rệt.`;
           suggestedAction = 'NEUTRAL (Quan sát)';
        }

        // --- ĐÒN BẨY & QUẢN TRỊ RỦI RO ĐỘNG ---
        // Volatility cao (ATR lớn) -> Leverage thấp, Volatility thấp -> Leverage cao
        // Giả sử Target Risk là 10% biến động sẽ cháy (Margin Call). Max đòn bẩy = 0.10 / ATR
        let recommendedLeverage = Math.floor(0.10 / atrPercent);
        if (recommendedLeverage > TRADING_CONFIG.MAX_GLOBAL_LEVERAGE) recommendedLeverage = TRADING_CONFIG.MAX_GLOBAL_LEVERAGE; // Capping leverage
        if (recommendedLeverage < 2) recommendedLeverage = 2;

        // Quy mô lệnh (Position Size): Risk % vốn / lệnh (fallback to TRADING_CONFIG)
        const envTradeRisk = this.configService.get<number>('TRADE_RISK_PERCENT', TRADING_CONFIG.TRADE_RISK_PERCENT);
        const tradeRiskPercent = envTradeRisk / 100;
        const maxLossPerTrade = capital * tradeRiskPercent;

        // Stop Loss = 1.5 * ATR. Take Profit = 3.0 * ATR
        const slDistance = atr * 1.5;

        // Allocation = (Risk USDT) / (StopLoss % distance)
        const stopLossPercent = slDistance / currentClose;

        // --- HYBRID ARCHITECTURE: BỘ LỌC NHIỄU (NOISE FILTER) ---
        // Nếu Stop Loss tính toán ra lớn hơn 6%, chứng tỏ coin đang bị thao túng (pump & dump) quá mạnh.
        // Bỏ qua không giao dịch đồng này để bảo vệ tài khoản khỏi râu nến (whipsaw).
        if (stopLossPercent > 0.06) {
          this.logger.debug(`[${symbol}] Bỏ qua do độ biến động quá lớn (SL = ${(stopLossPercent * 100).toFixed(2)}% > 6%)`);
          continue;
        }

        let allocationSize = maxLossPerTrade / stopLossPercent;
        if (allocationSize > capital * recommendedLeverage) {
          allocationSize = capital * recommendedLeverage; // Không vượt quá max purchasing power
        }

        // We want the bot to lose maxLossPerTrade USDT if SL is hit, and gain 2x if TP is hit.
        const stopLossAmount = maxLossPerTrade;
        const takeProfitAmount = maxLossPerTrade * 2; // R:R = 1:2

        // Tính toán mức giá TP / SL gợi ý
        let suggestedTpPrice = undefined;
        let suggestedSlPrice = undefined;
        if (suggestedAction.includes('LONG')) {
          suggestedSlPrice = currentClose - slDistance;
          suggestedTpPrice = currentClose + (slDistance * 2);
        } else if (suggestedAction.includes('SHORT')) {
          suggestedSlPrice = currentClose + slDistance;
          suggestedTpPrice = currentClose - (slDistance * 2);
        }

        // // ================================
        // suggestedAction=suggestedAction.includes('LONG') ? 'SHORT' : 'LONG';
        // reason='Đã đảo vị thế';
        // // ================================

        const lastExitPrice = await this.futuresTradeService.findLastExitPrice(symbol);

        opportunities.push({
           symbol,
           volume,
           priceChangePercent,
           volatility,
           fundingRate,
           score,
           reason,
           suggestedAction,
           recommendedLeverage,
           allocationSize,
           takeProfitAmount,
           stopLossAmount,
           currentPrice: currentClose,
           suggestedTpPrice,
           suggestedSlPrice,
           lastExitPrice: lastExitPrice || undefined
        });
      }

      // Sắp xếp theo điểm số giảm dần
      opportunities.sort((a, b) => b.score - a.score);

      return {
        capital,
        tokens: opportunities.slice(0, 5) // Lấy top 5
      };
    } catch (error) {
      this.logger.error('Lỗi khi lấy dữ liệu Binance Futures:', error);
      throw error;
    }
  }

  public async analyzeTokens(symbols: string[]): Promise<TokenOpportunity[]> {
    if (!symbols || symbols.length === 0) return [];

    const opportunities: TokenOpportunity[] = [];
    try {
      const tickerRes = await axios.get('https://fapi.binance.com/fapi/v1/ticker/24hr');
      const tickers: any[] = tickerRes.data;
      const tickerMap = new Map(tickers.map(t => [t.symbol, t]));

      const fundingRes = await axios.get('https://fapi.binance.com/fapi/v1/premiumIndex');
      const fundingMap = new Map<string, number>();
      for (const f of fundingRes.data) {
        fundingMap.set(f.symbol, parseFloat(f.lastFundingRate));
      }

      for (const symbol of symbols) {
        const t = tickerMap.get(symbol);
        if (!t) continue;

        const volume = parseFloat(t.quoteVolume);
        const fundingRate = fundingMap.get(symbol) || 0;
        const priceChangePercent = parseFloat(t.priceChangePercent);

        let klines: any[] = [];
        try {
          const klineRes = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=50`);
          klines = klineRes.data;
        } catch (err) {
          this.logger.warn(`Lỗi lấy klines cho ${symbol}, skip.`);
          continue;
        }
        if (klines.length < 25) continue;

        // Tính ATR (14)
        const period = 14;
        let sumTr = 0;
        for (let i = 1; i <= period; i++) {
          const high = parseFloat(klines[i][2]);
          const low = parseFloat(klines[i][3]);
          const prevClose = parseFloat(klines[i - 1][4]);
          const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
          sumTr += tr;
        }
        let atr = sumTr / period;
        for (let i = period + 1; i < klines.length; i++) {
          const high = parseFloat(klines[i][2]);
          const low = parseFloat(klines[i][3]);
          const prevClose = parseFloat(klines[i - 1][4]);
          const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
          atr = (atr * (period - 1) + tr) / period;
        }

        // Tính Z-Score (20)
        const zPeriod = 20;
        const closes = klines.slice(-zPeriod).map((k: any) => parseFloat(k[4]));
        const currentClose = closes[closes.length - 1];
        const mean = closes.reduce((a, b) => a + b, 0) / zPeriod;
        const stdDev = Math.sqrt(closes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / zPeriod);
        const zScore = stdDev === 0 ? 0 : (currentClose - mean) / stdDev;

        const atrPercent = (atr / currentClose);
        const score = (atrPercent * 10000) + (Math.abs(zScore) * 10);
        let reason = '';
        let suggestedAction = '';

        if (zScore > 2.0) {
           reason = `Giá vượt biên trên (Z-Score: ${zScore.toFixed(2)}). Lực bán chốt lời chuẩn bị kích hoạt.`;
           suggestedAction = 'SHORT (Scalp / Mean Reversion)';
        } else if (zScore < -2.0) {
           reason = `Giá rớt khỏi biên dưới (Z-Score: ${zScore.toFixed(2)}). Khả năng bật hồi cao.`;
           suggestedAction = 'LONG (Bắt đáy / Mean Reversion)';
        } else if (zScore > 1.0 && priceChangePercent > 3) {
           reason = `Xu hướng TĂNG Momentum (Z-Score: ${zScore.toFixed(2)}).`;
           suggestedAction = 'LONG (Thuận xu hướng)';
        } else if (zScore < -1.0 && priceChangePercent < -3) {
           reason = `Xu hướng GIẢM Momentum (Z-Score: ${zScore.toFixed(2)}).`;
           suggestedAction = 'SHORT (Thuận xu hướng)';
        } else {
           reason = `Đi ngang (Z-Score: ${zScore.toFixed(2)}), chưa có setup rõ rệt.`;
           suggestedAction = 'NEUTRAL (Quan sát)';
        }

        opportunities.push({
           symbol,
           volume,
           priceChangePercent,
           volatility: atrPercent,
           fundingRate,
           score,
           reason,
           suggestedAction,
           recommendedLeverage: 0, // Not needed for analysis
           allocationSize: 0,
        });
      }
    } catch (error) {
      this.logger.error('Lỗi khi lấy dữ liệu phân tích Tokens:', error);
    }
    return opportunities;
  }
}
