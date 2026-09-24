export interface OpenPosition {
  symbol: string;
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  entryPrice: number;
  positionAmt: number;
  unrealizedPnl: number;
  entryTime: number; // Timestamp lúc mở lệnh
}

export interface MicrostructureMetrics {
  rsiM1: number;
  ema9M1: number;
  ema21M1: number;
  lastVolumeRatio: number; // Volume nến hiện tại / Volume trung bình 20 nến
  isPinbarRejection: boolean;
}
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MicrostructureExitService {
  private readonly logger = new Logger(MicrostructureExitService.name);

  /**
   * Đánh giá vị thế đang mở có vi phạm điều kiện thoát lệnh microstructure hay không
   */
  public shouldExitPosition(
    position: OpenPosition,
    candlesM1: Array<{
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>,
  ): { shouldExit: boolean; reason: string } {
    if (candlesM1.length < 20) {
      return { shouldExit: false, reason: 'Chưa đủ dữ liệu nến M1' };
    }

    const currentCandle = candlesM1[candlesM1.length - 1];
    const isLong = position.positionAmt > 0;
    const pnlPercent =
      ((currentCandle.close - position.entryPrice) / position.entryPrice) *
      (isLong ? 1 : -1) *
      100;
    const holdingDurationMinutes =
      (Date.now() - position.entryTime) / (1000 * 60);

    // --- 1. HARD STOP LOSS & PROTECTIVE CUT (Chống gồng lỗ kéo dài) ---
    // Cắt ngay nếu lỗ quá 1.5% hoặc gồng lỗ > 30 phút mà PnL vẫn âm
    if (pnlPercent <= -1.5) {
      return {
        shouldExit: true,
        reason: `HARD SL: Lỗ ${pnlPercent.toFixed(2)}% vượt ngưỡng 1.5%`,
      };
    }
    if (holdingDurationMinutes > 30 && pnlPercent < -0.5) {
      return {
        shouldExit: true,
        reason: `TIME-BASED CUT: Gồng lỗ ${holdingDurationMinutes.toFixed(0)}m (>30m)`,
      };
    }

    // --- 2. MICROSTRUCTURE METRICS (Nến M1 + Volume) ---
    const avgVolume =
      candlesM1.slice(-21, -1).reduce((sum, c) => sum + c.volume, 0) / 20;
    const volRatio = currentCandle.volume / avgVolume;

    // Tính toán Nến Rút Chân (Pinbar Rejection)
    const bodySize = Math.abs(currentCandle.close - currentCandle.open);
    const candleRange = currentCandle.high - currentCandle.low;
    const upperWick =
      currentCandle.high - Math.max(currentCandle.open, currentCandle.close);
    const lowerWick =
      Math.min(currentCandle.open, currentCandle.close) - currentCandle.low;

    // --- 3. TÍN HIỆU THOÁT ĐỐI VỚI LỆNH LONG ---
    if (isLong) {
      // a) Volume Spike Rejection: Thấy nến xả nến búa ngược M1 với Volume gấp 2.5x trung bình
      const isBearishPinbar =
        upperWick > bodySize * 2 && upperWick / candleRange > 0.5;
      if (isBearishPinbar && volRatio > 2.5) {
        return {
          shouldExit: true,
          reason: `LONG EXIT: Volume Spike Bearish Pinbar (Vol x${volRatio.toFixed(1)})`,
        };
      }

      // b) Indicator Exit: Giá cắt xuống dưới EMA9 M1 khi đang có lời để bảo toàn profit
      const ema9 = this.calculateEMA(
        candlesM1.map((c) => c.close),
        9,
      );
      if (pnlPercent > 0.8 && currentCandle.close < ema9) {
        return {
          shouldExit: true,
          reason: `LONG TAKE PROFIT: Giá gãy EMA9 M1 tại PnL +${pnlPercent.toFixed(2)}%`,
        };
      }
    }

    // --- 4. TÍN HIỆU THOÁT ĐỐI VỚI LỆNH SHORT ---
    if (!isLong) {
      // a) Volume Spike Rejection: Thấy nến rút chân tăng M1 với Vol gấp 2.5x
      const isBullishPinbar =
        lowerWick > bodySize * 2 && lowerWick / candleRange > 0.5;
      if (isBullishPinbar && volRatio > 2.5) {
        return {
          shouldExit: true,
          reason: `SHORT EXIT: Volume Spike Bullish Pinbar (Vol x${volRatio.toFixed(1)})`,
        };
      }

      // b) Indicator Exit: Giá cắt lên trên EMA9 M1 khi đang có lời
      const ema9 = this.calculateEMA(
        candlesM1.map((c) => c.close),
        9,
      );
      if (pnlPercent > 0.8 && currentCandle.close > ema9) {
        return {
          shouldExit: true,
          reason: `SHORT TAKE PROFIT: Giá vượt EMA9 M1 tại PnL +${pnlPercent.toFixed(2)}%`,
        };
      }
    }

    return { shouldExit: false, reason: 'Chưa chạm ngưỡng thoát' };
  }

  private calculateEMA(prices: number[], period: number): number {
    const k = 2 / (period + 1);
    return prices.reduce(
      (acc, val, i) => (i === 0 ? val : val * k + acc * (1 - k)),
      0,
    );
  }
}
