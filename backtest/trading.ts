import { Client } from 'pg';
import axios from 'axios';
import { SMA, ATR, RSI } from 'technicalindicators';
import * as fs from 'fs';
import * as path from 'path';

// Load ENV if necessary
import * as dotenv from 'dotenv';
dotenv.config();

// --- Configuration ---
// const dbConfig = {
//   host: process.env.POSTGRES_HOST || 'localhost',
//   port: parseInt(process.env.POSTGRES_PORT || '5432'),
//   user: process.env.POSTGRES_USER || 'postgres',
//   password: process.env.POSTGRES_PASSWORD || 'guYGpMSkIwMEgFi1dDoPgB2EaPc5mM',
//   database: process.env.POSTGRES_DB || 'binance_backtest',
// };

const dbConfig = {
  host: process.env.POSTGRES_HOST || '10.0.40.117',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password:
    process.env.POSTGRES_PASSWORD || 'jSQGCscokz6ErQaMfe9ZMG4cRcEtHVl2ZrS',
  database: process.env.POSTGRES_DB || 'binance_backtest',
};
const OLLAMA_HOST = 'http://10.0.40.103:11434';

const START_DATE = new Date('2026-01-01T00:00:00Z').getTime();
const END_DATE = Date.now(); // Present
const INTERVAL = '15m';
const MAX_POSITIONS = 5;
const INITIAL_BALANCE = 10000;
const DAILY_PROFIT_TARGET = 200;
const DAILY_LOSS_LIMIT = -100;
const TAKER_FEE = 0.0004; // 0.04% for Binance Futures (usually 0.05%, let's use 0.04% avg or 0.05% for Taker)

interface Config {
  rsiPeriod: number;
  rsiLongThreshold: number;
  rsiShortThreshold: number;
  smaPeriod: number;
  atrPeriod: number;
  atrMultiplierSL: number;
  atrMultiplierTP: number;
  leverage: number;
  riskPerTradePercent: number; // e.g. 0.02 for 2%
  limitOffset: number; // e.g. 0.002 for 0.2% deeper entry
}

interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Position {
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  size: number;
  leverage: number;
  stopLoss: number;
  takeProfit: number;
  margin: number;
  highestPrice: number; // to trail SL
  llmReason?: string;
  llmPattern?: string;
  historical?: Candle[];
  lowestPrice: number; // to trail SL
  entryTime?: number; // track time for duration
}

interface PendingOrder extends Position {
  limitPrice: number;
  score: number;
  currentRSI: number;
  historical: Candle[];
}

class TradingBacktest {
  private db: Client;
  private symbols: string[] = [];
  private data: Record<string, Candle[]> = {};
  private learnedLessons: string[] = [];

  constructor() {
    this.db = new Client(dbConfig);
  }

  async initDB() {
    await this.db.connect();
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS klines_15m (
        symbol VARCHAR(50),
        open_time BIGINT,
        open NUMERIC,
        high NUMERIC,
        low NUMERIC,
        close NUMERIC,
        volume NUMERIC,
        PRIMARY KEY (symbol, open_time)
      );
      CREATE TABLE IF NOT EXISTS crawl_status_15m (
        symbol VARCHAR(50) PRIMARY KEY,
        start_date BIGINT,
        end_date BIGINT
      );
      CREATE INDEX IF NOT EXISTS idx_klines_15m_open_time ON klines_15m(open_time);
    `);
  }

  async fetchAllSymbols() {
    console.log('Fetching all futures symbols...');
    const res = await axios.get(
      'https://fapi.binance.com/fapi/v1/exchangeInfo',
    );
    this.symbols = res.data.symbols
      .filter(
        (s: any) =>
          s.status === 'TRADING' &&
          s.contractType === 'PERPETUAL' &&
          s.quoteAsset === 'USDT',
      )
      .map((s: any) => s.symbol);

    // Uncomment to test all tokens. For now, picking top 50 to speed up first run.
    // Lấy tất cả tokens
    // this.symbols = this.symbols.slice(0, 50);
    console.log(`Loaded ${this.symbols.length} symbols.`);
  }

  async syncData() {
    console.log('Syncing data backwards from today to 2026-01-01...');
    let i = 0;
    for (const symbol of this.symbols) {
      i++;
      const statusRes = await this.db.query(
        'SELECT start_date, end_date FROM crawl_status_15m WHERE symbol = $1',
        [symbol],
      );
      let currentEndTime = END_DATE;

      if (statusRes.rows.length > 0) {
        if (Number(statusRes.rows[0].start_date) <= START_DATE) continue;
        currentEndTime = Number(statusRes.rows[0].start_date);
      }

      console.log(
        `Downloading ${symbol} backwards from ${new Date(
          currentEndTime,
        ).toISOString()} to ${new Date(START_DATE).toISOString()}`,
      );
      while (currentEndTime > START_DATE) {
        try {
          const klines_15mRes = await axios.get(
            'https://fapi.binance.com/fapi/v1/klines',
            {
              params: {
                symbol,
                interval: INTERVAL,
                endTime: currentEndTime,
                limit: 1500,
              },
            },
          );

          if (!klines_15mRes.data || klines_15mRes.data.length === 0) break;

          const values = klines_15mRes.data
            .map(
              (k: any) =>
                `('${symbol}', ${k[0]}, ${k[1]}, ${k[2]}, ${k[3]}, ${k[4]}, ${k[5]})`,
            )
            .join(',');

          await this.db.query(`
            INSERT INTO klines_15m (symbol, open_time, open, high, low, close, volume)
            VALUES ${values}
            ON CONFLICT (symbol, open_time) DO NOTHING;
            `);
          const fetchedStartTime = klines_15mRes.data[0][0];

          await this.db.query(
            `
            INSERT INTO crawl_status_15m (symbol, start_date, end_date)
            VALUES ($1, $2, $3)
            ON CONFLICT (symbol) DO UPDATE SET start_date = LEAST(crawl_status_15m.start_date, $2), end_date = GREATEST(crawl_status_15m.end_date, $3);
          `,
            [symbol, fetchedStartTime, currentEndTime],
          );

          currentEndTime = fetchedStartTime - 1;

          console.clear();
          console.table({
            symbol,
            index: `${i}/${this.symbols.length}`,
            fetchedStartTime: new Date(fetchedStartTime).toISOString(),
            currentEndTime: new Date(currentEndTime).toISOString(),
          });

          await new Promise((r) => setTimeout(r, 100)); // Sleep to avoid API bans
        } catch (e: any) {
          console.error(`Error fetching ${symbol}:`, e.message);
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  }

  async loadDataChunk(start: number, end: number) {
    console.log(
      `Loading data chunk from ${new Date(start).toISOString()} to ${new Date(end).toISOString()}...`,
    );
    this.data = {}; // Free old memory!

    const res = await this.db.query(
      `
      SELECT symbol, open_time, open, high, low, close, volume
      FROM klines_15m
      WHERE open_time >= $1 AND open_time <= $2
      ORDER BY open_time ASC
    `,
      [start, end],
    );

    for (const row of res.rows) {
      const sym = row.symbol;
      if (!this.data[sym]) this.data[sym] = [];
      this.data[sym].push({
        openTime: Number(row.open_time),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      });
    }
  }

  async getTopTokensAtTime(time: number, limit: number): Promise<string[]> {
    const res = await this.db.query(
      `
      SELECT symbol FROM klines_15m
      WHERE open_time = $1
      ORDER BY volume DESC
      LIMIT $2
    `,
      [time, limit],
    );
    return res.rows.map((r) => r.symbol);
  }

  // --- 1. Calculate Entry, Position Size, Leverage ---
  calculateEntry(
    symbol: string,
    historicalData: Candle[],
    currentCandle: Candle,
    config: Config,
    currentBalance: number,
  ): PendingOrder | null {
    if (
      historicalData.length <
      Math.max(config.smaPeriod, config.rsiPeriod, config.atrPeriod)
    )
      return null;

    const closes = historicalData.map((d) => d.close);
    closes.push(currentCandle.close);

    const sma = SMA.calculate({ period: config.smaPeriod, values: closes });
    const rsi = RSI.calculate({ period: config.rsiPeriod, values: closes });

    const currentSMA = sma[sma.length - 1];
    const currentRSI = rsi[rsi.length - 1];
    const currentPrice = currentCandle.close;

    let type: 'LONG' | 'SHORT' | null = null;

    // Trend following + pullback logic
    if (currentPrice > currentSMA && currentRSI < config.rsiLongThreshold) {
      type = 'LONG';
    } else if (
      currentPrice < currentSMA &&
      currentRSI > config.rsiShortThreshold
    ) {
      type = 'SHORT';
    }

    if (!type) return null;

    // Limit offset to catch deeper dips / higher peaks
    const limitPrice =
      type === 'LONG'
        ? currentPrice * (1 - config.limitOffset)
        : currentPrice * (1 + config.limitOffset);

    // Calculate position size based on risk
    const riskAmount = currentBalance * config.riskPerTradePercent;
    const margin = riskAmount;
    const size = (margin * config.leverage) / limitPrice;

    // Calculate ATR for SL/TP based on entry (limitPrice)
    const highs = historicalData.map((d) => d.high).concat(currentCandle.high);
    const lows = historicalData.map((d) => d.low).concat(currentCandle.low);
    const atr = ATR.calculate({
      period: config.atrPeriod,
      high: highs,
      low: lows,
      close: closes,
    });
    const currentATR = atr[atr.length - 1];

    let stopLoss = 0;
    let takeProfit = 0;

    if (type === 'LONG') {
      stopLoss = limitPrice - currentATR * config.atrMultiplierSL;
      takeProfit = limitPrice + currentATR * config.atrMultiplierTP;
    } else {
      stopLoss = limitPrice + currentATR * config.atrMultiplierSL;
      takeProfit = limitPrice - currentATR * config.atrMultiplierTP;
    }

    // Score to rank potential of the token (high volatility + extreme RSI is better)
    let score = (currentATR / currentPrice) * 100;
    if (type === 'LONG') score += 50 - currentRSI;
    if (type === 'SHORT') score += currentRSI - 50;

    return {
      symbol,
      type,
      limitPrice,
      entryPrice: limitPrice,
      size,
      leverage: config.leverage,
      stopLoss,
      takeProfit,
      margin,
      highestPrice: limitPrice,
      lowestPrice: limitPrice,
      score,
      currentRSI,
      historical: historicalData.slice(-15),
    };
  }


  async evaluateTradeResult(
    symbol: string,
    type: 'LONG' | 'SHORT',
    entryPrice: number,
    exitPrice: number,
    netPnL: number,
    reason: string | undefined,
    pattern: string | undefined,
    durationMs: number,
    historical: Candle[] | undefined
  ): Promise<void> {
    const isWin = netPnL > 0;
    if (isWin) return; // Chỉ học từ các lệnh thua lỗ theo yêu cầu

    const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(1);
    const currentLessonsStr = this.learnedLessons.length > 0 
      ? `Current Lessons:\n${this.learnedLessons.map((l, i) => `${i+1}. ${l}`).join('\n')}`
      : `Current Lessons: None`;

    const prompt = `You are an AI Trading Evaluator.
You previously approved a ${type} position on ${symbol}.
Original Reason: "${reason || 'Unknown'}"
Pattern Identified: "${pattern || 'None'}"

The market context BEFORE entry was (recent 10 candles OHLC):
${historical ? historical.slice(-10).map(c => `O:${c.open.toFixed(4)} H:${c.high.toFixed(4)} L:${c.low.toFixed(4)} C:${c.close.toFixed(4)}`).join(' | ') : 'Unknown'}

The trade closed with a LOSS of ${Math.abs(netPnL).toFixed(2)}.

${currentLessonsStr}

Task:
1. Identify the mistake made in this trade (e.g. entered too late, ignored RSI divergence, etc).
2. Formulate a concise new lesson to avoid this mistake.
3. Combine this new lesson with the "Current Lessons".
4. Filter, merge, and refine the combined list. Remove overlapping, repeated, or useless lessons. Keep only the most valuable and distinct rules (max 15).
5. Output the final refined list of lessons as a JSON array of strings under the key "lessons".

Respond ONLY in strict JSON format like this: {"lessons": ["Rule 1", "Rule 2"]}`;

    try {
      const res = await axios.post(`${OLLAMA_HOST}/api/generate`, {
        model: 'mistral:latest',
        prompt: prompt,
        stream: false,
        format: 'json',
      });

      let responseText = res.data.response;
      let newLessons: string[] = [];
      
      try {
        const parsed = JSON.parse(responseText);
        if (Array.isArray(parsed.lessons)) {
          newLessons = parsed.lessons;
        }
      } catch (e: any) {
        // fallback regex to find array
        const match = responseText.match(/"lessons"\s*:\s*(\[[^\]]+\])/i);
        if (match) {
           try { newLessons = JSON.parse(match[1]); } catch (err) {}
        }
      }

      if (newLessons.length > 0) {
         this.learnedLessons = newLessons.slice(0, 15);
         const mdContent = "# AI Trading Lessons\n\n" + this.learnedLessons.map((l: string) => `- ${l}`).join('\n');
         fs.writeFileSync(path.join(__dirname, 'AI_lessons.md'), mdContent);
         console.log(`[AI LEARNING] Refined lessons after loss on ${symbol}. Total rules: ${this.learnedLessons.length}`);
      }
    } catch (e: any) {
      console.log('Error evaluating trade result:', e.message);
    }
  }

  async askOllama(
    symbol: string,
    type: string,
    currentPrice: number,
    currentRSI: number,
    historical: Candle[],
  ): Promise<{ approve: boolean; pattern: string; reason: string }> {
    try {
      // Create a simplified text representation of recent price action
      const recentCandles = historical
        .slice(-10)
        .map(
          (c) =>
            `O:${c.open.toFixed(4)} H:${c.high.toFixed(4)} L:${c.low.toFixed(4)} C:${c.close.toFixed(4)}`,
        )
        .join(' | ');

      const lessonsBlock = this.learnedLessons.length > 0
        ? `\n--- CRITICAL LESSONS LEARNED FROM PAST TRADES ---\n${this.learnedLessons.map((l, i) => `${i+1}. ${l}`).join('\n')}\n------------------------------------------------------\n`
        : '';

      const prompt = `You are an expert crypto technical analyst. We are considering a ${type} trade on ${symbol}.${lessonsBlock}
RSI(14): ${currentRSI.toFixed(2)}
Recent 10 Candles (OHLC): ${recentCandles}

Task:
1. Analyze the price momentum (e.g., strong trend, sideways, pullback) and identify any candlestick patterns if present.
2. Based on the momentum, RSI, and overall context, decide whether to approve this ${type} trade. You can approve the trade even if no specific pattern is found, as long as the trend and RSI are favorable.

Respond ONLY in strict JSON format like this: {"approve": true, "pattern": "name of pattern or 'None'", "reason": "brief explanation"}. Do not output any other text.`;

      const res = await axios.post(`${OLLAMA_HOST}/api/generate`, {
        model: 'mistral:latest',
        prompt: prompt,
        stream: false,
        format: 'json',
      });

      let responseText = res.data.response;

      const rawLog = `[RAW LLM RESPONSE] ${symbol} ${type}\n${responseText}\n====================================\n`;
      fs.appendFileSync(path.join(__dirname, 'LLM_log.txt'), rawLog);

      let approve = true;
      let pattern = 'Unknown';
      let reason = 'Parsed successfully';

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) throw new Error('No JSON bracket found');
        const parsed = JSON.parse(jsonMatch[0]);
        approve = !!parsed.approve;
        pattern = parsed.pattern || 'None identified';
        reason = parsed.reason || 'No reason provided';
      } catch (parseError) {
        const lowerText = responseText.toLowerCase();
        approve =
          (lowerText.includes('true') ||
            lowerText.includes('approve') ||
            lowerText.includes('yes')) &&
          !lowerText.includes('false') &&
          !lowerText.includes('reject');
        pattern = 'Fuzzy Extracted';
        reason = `Fuzzy matched (No JSON): ${responseText.substring(0, 80)}...`;
      }

      return { approve, pattern, reason };
    } catch (e: any) {
      console.error('Ollama API error:', e.message);
      return { approve: true, pattern: 'Error', reason: 'LLM Fallback' };
    }
  }

  // --- 3. Adjust SL and TP during trade ---
  adjustSLTP(
    position: Position,
    currentCandle: Candle,
    config: Config,
    now: number,
  ) {
    const holdTime = position.entryTime ? now - position.entryTime : 0;
    const ADJUST_TIME_MS = 30 * 60 * 1000; // 30 mins

    if (position.type === 'LONG') {
      // --- 30 Min Aggressive Optimization ---
      if (holdTime >= ADJUST_TIME_MS) {
        // If in profit after 30 mins, secure breakeven + fees
        if (currentCandle.close > position.entryPrice * (1 + TAKER_FEE * 2)) {
          position.stopLoss = Math.max(
            position.stopLoss,
            position.entryPrice * (1 + TAKER_FEE * 2),
          );
        }
        // Force TP closer to current price to secure something before 1h timeout
        if (currentCandle.close > position.entryPrice) {
          const newTP =
            currentCandle.close +
            (currentCandle.close - position.entryPrice) * 0.5;
          if (newTP < position.takeProfit) position.takeProfit = newTP;
        }
      }
      position.highestPrice = Math.max(
        position.highestPrice,
        currentCandle.high,
      );
      const profitPercent =
        (currentCandle.close - position.entryPrice) / position.entryPrice;

      // Trailing SL: move SL to breakeven if profit > 2%
      if (profitPercent > 0.02 && position.stopLoss < position.entryPrice) {
        position.stopLoss = position.entryPrice;
      }

      // Trailing TP: lower TP if price starts dropping but we are close to original TP
      const tpDistance = position.takeProfit - position.entryPrice;
      if (currentCandle.close > position.entryPrice + tpDistance * 0.8) {
        position.takeProfit = currentCandle.close; // Take profit early to secure
      }
    } else {
      // --- 30 Min Aggressive Optimization ---
      if (holdTime >= ADJUST_TIME_MS) {
        if (currentCandle.close < position.entryPrice * (1 - TAKER_FEE * 2)) {
          position.stopLoss = Math.min(
            position.stopLoss,
            position.entryPrice * (1 - TAKER_FEE * 2),
          );
        }
        if (currentCandle.close < position.entryPrice) {
          const newTP =
            currentCandle.close -
            (position.entryPrice - currentCandle.close) * 0.5;
          if (newTP > position.takeProfit) position.takeProfit = newTP;
        }
      }

      position.lowestPrice = Math.min(position.lowestPrice, currentCandle.low);
      const profitPercent =
        (position.entryPrice - currentCandle.close) / position.entryPrice;

      if (profitPercent > 0.02 && position.stopLoss > position.entryPrice) {
        position.stopLoss = position.entryPrice;
      }

      const tpDistance = position.entryPrice - position.takeProfit;
      if (currentCandle.close < position.entryPrice - tpDistance * 0.8) {
        position.takeProfit = currentCandle.close;
      }
    }
  }

  // --- 4. Run Backtest Simulation ---
  async runBacktest(config: Config, runIndex: number): Promise<number> {
    console.log(`\n--- Starting Backtest Run ${runIndex} ---`);
    console.log('Config:', config);

    let balance = INITIAL_BALANCE;
    const openPositions: Position[] = [];
    const pendingOrders: PendingOrder[] = [];
    const dailyPnL: Record<string, number> = {};
    let currentDay = '';
    let stopTradingToday = false;
    let stopReason: 'PROFIT' | 'LOSS' | null = null;

    // --- Statistics ---
    let totalPositions = 0;

    // --- Daily Statistics ---
    let dailyPositions = 0;
    let dailyWins = 0;
    let dailyLosses = 0;
    let dailyWinPnL = 0;
    let dailyLossPnL = 0;
    let dailyFees = 0;
    let dailyNetPnL = 0;
    let totalLongs = 0;
    let totalShorts = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalDurationMs = 0;

    // Generate chronological timeline mathematically to avoid parsing memory
    const timeline: number[] = [];
    for (let t = START_DATE; t <= END_DATE; t += 15 * 60 * 1000) {
      // 15m steps {
      timeline.push(t);
    }

    const CHUNK_MS = 30 * 24 * 60 * 60 * 1000; // Load 30 days of data at a time
    const MAX_LOOKBACK_MS = 200 * 60 * 60 * 1000; // Keep trailing 200 hours for indicators

    let currentChunkStart = START_DATE;
    let currentChunkEnd = START_DATE + CHUNK_MS;

    await this.loadDataChunk(currentChunkStart, currentChunkEnd);

    for (
      let i = Math.max(config.smaPeriod, config.rsiPeriod, config.atrPeriod);
      i < timeline.length;
      i++
    ) {
      const now = timeline[i];

      if (
        balance < 10 &&
        openPositions.length === 0 &&
        pendingOrders.length === 0
      ) {
        console.log(
          `[LIQUIDATED] Account balance is $${balance.toFixed(2)} (Below $10). Halting run...`,
        );
        break;
      }

      if (now > currentChunkEnd) {
        // Slide the window forward
        currentChunkStart = currentChunkEnd - MAX_LOOKBACK_MS;
        currentChunkEnd = currentChunkEnd + CHUNK_MS;
        await this.loadDataChunk(currentChunkStart, currentChunkEnd);
      }
      const dateStr = new Date(now).toISOString().split('T')[0];

      if (currentDay !== dateStr) {
        if (currentDay !== '') {
          // Calculate Total Equity
          let lockedMargin = 0;
          let unrealizedPnL = 0;

          for (const pos of openPositions) {
            lockedMargin += pos.margin;
            // Find current candle directly
            const currentCandle = this.data[pos.symbol]?.find(
              (c) => c.openTime === now,
            );
            if (currentCandle) {
              const floating =
                pos.type === 'LONG'
                  ? (currentCandle.close - pos.entryPrice) * pos.size
                  : (pos.entryPrice - currentCandle.close) * pos.size;
              const exitFee = pos.size * currentCandle.close * TAKER_FEE;
              unrealizedPnL += floating - exitFee;
            }
          }
          for (const ord of pendingOrders) lockedMargin += ord.margin;

          const realizedEquity = balance + lockedMargin;
          const totalEquity = realizedEquity + unrealizedPnL;
          dailyPnL[currentDay] = realizedEquity;

          let dailyLog = `[${currentDay}] Total Equity: $${totalEquity.toFixed(2)} | Realized Equity: $${realizedEquity.toFixed(2)} | Floating PnL: $${unrealizedPnL.toFixed(2)}\n`;
          dailyLog += `   -> Trades Closed Today: ${dailyPositions} (Wins: ${dailyWins}, Losses: ${dailyLosses})\n`;
          dailyLog += `   -> Win PnL: +$${dailyWinPnL.toFixed(2)} | Loss PnL: -$${dailyLossPnL.toFixed(2)} | Total Fees: $${dailyFees.toFixed(2)}\n`;
          dailyLog += `   -> Final Daily Net PnL: $${dailyNetPnL.toFixed(2)}\n\n`;

          fs.appendFileSync(
            path.join(__dirname, 'backtest_report.txt'),
            dailyLog,
          );

          // Reset daily stats
          dailyPositions = 0;
          dailyWins = 0;
          dailyLosses = 0;
          dailyWinPnL = 0;
          dailyLossPnL = 0;
          dailyFees = 0;
          dailyNetPnL = 0;
        } else {
          let headerContent = `\n--- Run ${runIndex} ---\n`;
          headerContent += `Config: ${JSON.stringify(config)}\n`;
          headerContent += `\nDaily PnL:\n`;
          fs.appendFileSync(
            path.join(__dirname, 'backtest_report.txt'),
            headerContent,
          );
        }
        currentDay = dateStr;
        stopTradingToday = false;
        stopReason = null;
      }

      // 0. Check Daily Limits
      // if (!stopTradingToday) {
      //   let floatingPnL = 0;
      //   for (const pos of openPositions) {
      //     const currentCandle = this.data[pos.symbol]?.find(
      //       (c) => c.openTime === now,
      //     );
      //     if (currentCandle) {
      //       const gross =
      //         pos.type === 'LONG'
      //           ? (currentCandle.close - pos.entryPrice) * pos.size
      //           : (pos.entryPrice - currentCandle.close) * pos.size;
      //       const exitFee = pos.size * currentCandle.close * TAKER_FEE;
      //       // floatingPnL += gross - exitFee;
      //     }
      //   }
        // const totalTodayPnL = dailyNetPnL + floatingPnL;
        // if (totalTodayPnL >= DAILY_PROFIT_TARGET) {
        //   console.log(
        //     `[${new Date(now).toISOString()}] [DAILY TARGET] Reached ${totalTodayPnL.toFixed(2)}. Stopping new trades today.`,
        //   );
        //   stopTradingToday = true;
        //   stopReason = 'PROFIT';
        // } else if (totalTodayPnL <= DAILY_LOSS_LIMIT) {
        //   console.log(
        //     `[${new Date(now).toISOString()}] [DAILY STOP LOSS] Reached ${totalTodayPnL.toFixed(2)}. Force closing all open trades.`,
        //   );
        //   stopTradingToday = true;
        //   stopReason = 'LOSS';
        // }
      // }

      // 1. Process Pending Orders (Try to fill them using this candle's price)
      for (let j = pendingOrders.length - 1; j >= 0; j--) {
        if (stopTradingToday) {
          const order = pendingOrders[j];
          balance += order.margin;
          pendingOrders.splice(j, 1);
          continue;
        }
        const order = pendingOrders[j];
        const currentCandle = this.data[order.symbol]?.find(
          (c) => c.openTime === now,
        );

        if (currentCandle) {
          if (order.type === 'LONG' && currentCandle.low <= order.limitPrice) {
            // Filled! Deduct entry fee
            const entryFee = order.size * order.limitPrice * TAKER_FEE;
            balance -= entryFee;
            openPositions.push({ ...order, entryTime: now });
            totalPositions++;
            totalLongs++;
            pendingOrders.splice(j, 1);
          } else if (
            order.type === 'SHORT' &&
            currentCandle.high >= order.limitPrice
          ) {
            // Filled! Deduct entry fee
            const entryFee = order.size * order.limitPrice * TAKER_FEE;
            balance -= entryFee;
            openPositions.push({ ...order, entryTime: now });
            totalPositions++;
            totalShorts++;
            pendingOrders.splice(j, 1);
          } else {
            // Cancel order if not filled in the next candle to free up margin
            balance += order.margin;
            pendingOrders.splice(j, 1);
          }
        }
      }

      // 2. Check open positions for exit
      for (let j = openPositions.length - 1; j >= 0; j--) {
        const pos = openPositions[j];
        const currentCandle = this.data[pos.symbol]?.find(
          (c) => c.openTime === now,
        );
        if (!currentCandle) continue;

        let closePrice = 0;
        let closed = false;

        const holdTime = pos.entryTime ? now - pos.entryTime : 0;
        const ADJUST_TIME_MS = 30 * 60 * 1000; // 30 minutes

        const grossCurrent =
          pos.type === 'LONG'
            ? (currentCandle.close - pos.entryPrice) * pos.size
            : (pos.entryPrice - currentCandle.close) * pos.size;
        const exitFeeCurrent = pos.size * currentCandle.close * TAKER_FEE;

        if (stopTradingToday) {
          if (stopReason === 'LOSS') {
            closePrice = currentCandle.close;
            closed = true;
          } else if (stopReason === 'PROFIT' && grossCurrent > exitFeeCurrent) {
            closePrice = currentCandle.close; // Close because it's profitable and we reached target
            closed = true;
          }
        }

        if (!closed) {
          // Normal SL/TP check
          if (pos.type === 'LONG') {
            if (currentCandle.low <= pos.stopLoss) {
              closePrice = pos.stopLoss;
              closed = true;
            } else if (currentCandle.high >= pos.takeProfit) {
              closePrice = pos.takeProfit;
              closed = true;
            }
          } else {
            if (currentCandle.high >= pos.stopLoss) {
              closePrice = pos.stopLoss;
              closed = true;
            } else if (currentCandle.low <= pos.takeProfit) {
              closePrice = pos.takeProfit;
              closed = true;
            }
          }
        }

        if (closed) {
          const grossPnL =
            pos.type === 'LONG'
              ? (closePrice - pos.entryPrice) * pos.size
              : (pos.entryPrice - closePrice) * pos.size;

          const exitFee = pos.size * closePrice * TAKER_FEE;
          const entryFee = pos.size * pos.entryPrice * TAKER_FEE;

          const netPnL = grossPnL - exitFee - entryFee;

          // --- AI Reflection ---
          await this.evaluateTradeResult(
             pos.symbol,
             pos.type,
             pos.entryPrice,
             closePrice,
             netPnL,
             pos.llmReason,
             pos.llmPattern,
             pos.entryTime ? now - pos.entryTime : 0,
             pos.historical
          );

          // Update Daily Stats
          dailyPositions++;
          dailyFees += entryFee + exitFee;
          dailyNetPnL += netPnL;

          if (netPnL > 0) {
            totalProfit += netPnL;
            winningTrades++;
            dailyWins++;
            dailyWinPnL += netPnL;
          } else {
            totalLoss += Math.abs(netPnL);
            losingTrades++;
            dailyLosses++;
            dailyLossPnL += Math.abs(netPnL);
          }
          if (pos.entryTime) {
            totalDurationMs += now - pos.entryTime;
          }

          balance += pos.margin + grossPnL - exitFee;
          openPositions.splice(j, 1);
        } else {
          this.adjustSLTP(pos, currentCandle, config, now);
        }
      } // End openPositions loop

      // 3. Find new entries if we have slots (Max positions include open + pending)
      if (!stopTradingToday && openPositions.length + pendingOrders.length < MAX_POSITIONS) {
          const potentialEntries: PendingOrder[] = [];

          // Truy vấn database để tìm ra các token có volume giao dịch sôi động nhất tại ĐÚNG THỜI ĐIỂM NÀY (tránh bias chọn token của tương lai)
          const activeSymbols = await this.getTopTokensAtTime(now, 30);

          for (const symbol of activeSymbols) {
            if (
              openPositions.find((p) => p.symbol === symbol) ||
              pendingOrders.find((p) => p.symbol === symbol)
            )
              continue;

            const symbolData = this.data[symbol];
            const currentIndex = symbolData.findIndex(
              (c) => c.openTime === now,
            );
            if (
              currentIndex <
              Math.max(config.smaPeriod, config.rsiPeriod, config.atrPeriod)
            )
              continue;

            const currentCandle = symbolData[currentIndex];
            const historical = symbolData.slice(
              currentIndex -
                Math.max(config.smaPeriod, config.rsiPeriod, config.atrPeriod),
              currentIndex,
            );

            const newOrder = this.calculateEntry(
              symbol,
              historical,
              currentCandle,
              config,
              balance,
            );
            if (newOrder) {
              potentialEntries.push(newOrder);
            }
          }

          // Rank tokens and select the best ones
          potentialEntries.sort((a, b) => b.score - a.score);

          for (const order of potentialEntries) {
            if (openPositions.length + pendingOrders.length >= MAX_POSITIONS)
              break;

            // --- AI LLM FILTER ---
            // Ask Ollama if this trade is logical based on price action
            const llmDecision = await this.askOllama(
              order.symbol,
              order.type,
              order.entryPrice,
              order.currentRSI,
              order.historical,
            );

            if (!llmDecision.approve) {
              console.log(
                `[AI REJECTED] ${order.symbol} ${order.type} | Pattern: [${llmDecision.pattern}] - ${llmDecision.reason}`,
              );
              continue; // Skip this token, AI says no
            }
            console.log(
              `[AI APPROVED] ${order.symbol} ${order.type} | Pattern: [${llmDecision.pattern}] - ${llmDecision.reason}`,
            );

            // Deduct margin for pending order
            balance -= order.margin;
            pendingOrders.push({
               ...order,
               llmReason: llmDecision.reason,
               llmPattern: llmDecision.pattern
            });
          }
        }
      }

      // Force close remaining at the end
      for (const pos of openPositions) {
        const currentCandle =
          this.data[pos.symbol]?.[this.data[pos.symbol].length - 1];
        if (currentCandle) {
          const grossPnL =
            pos.type === 'LONG'
              ? (currentCandle.close - pos.entryPrice) * pos.size
              : (pos.entryPrice - currentCandle.close) * pos.size;

          const exitFee = pos.size * currentCandle.close * TAKER_FEE;
          const entryFee = pos.size * pos.entryPrice * TAKER_FEE;
          const netPnL = grossPnL - exitFee - entryFee;

          console.log(
            `[END OF BACKTEST] ${pos.symbol} ${pos.type} FORCE CLOSED | Gross PnL: ${grossPnL.toFixed(2)} | Fee: ${(entryFee + exitFee).toFixed(2)} | Net PnL: ${netPnL.toFixed(2)}`,
          );

          if (netPnL > 0) {
            totalProfit += netPnL;
            winningTrades++;
          } else {
            totalLoss += Math.abs(netPnL);
            losingTrades++;
          }
          if (pos.entryTime) {
            totalDurationMs += currentCandle.openTime - pos.entryTime;
          }

          balance += pos.margin + grossPnL - exitFee;
        }
      }

      // Refund pending orders
      for (const order of pendingOrders) {
        balance += order.margin;
      }

      dailyPnL[currentDay] = balance;

      // Report
      const totalNetPnL = balance - INITIAL_BALANCE;
      const winRate =
        totalPositions > 0
          ? ((winningTrades / totalPositions) * 100).toFixed(2)
          : '0.00';
      const avgDurationHours =
        totalPositions > 0
          ? (totalDurationMs / totalPositions / (1000 * 60 * 60)).toFixed(2)
          : '0.00';

      let reportContent = `\n--- Summary Run ${runIndex} ---\n`;
      reportContent += `Final Balance: ${balance.toFixed(2)}\n`;
      reportContent += `Total Net PnL: ${totalNetPnL.toFixed(2)}\n`;
      reportContent += `Total Positions Opened: ${totalPositions}\n`;
      reportContent += `Winning Trades: ${winningTrades}\n`;
      reportContent += `Losing Trades: ${losingTrades}\n`;
      reportContent += `Total LONGs: ${totalLongs}\n`;
      reportContent += `Total SHORTs: ${totalShorts}\n`;
      reportContent += `Total Profit (Gross of winners): ${totalProfit.toFixed(2)}\n`;
      reportContent += `Total Loss (Gross of losers): ${totalLoss.toFixed(2)}\n`;
      reportContent += `Win Rate: ${winRate}%\n`;
      reportContent += `Average Trade Duration: ${avgDurationHours} hours\n`;
      reportContent += `\n============================================\n\n`;

      fs.appendFileSync(
        path.join(__dirname, 'backtest_report.txt'),
        reportContent,
      );
      console.log(
        `Run ${runIndex} finished. Final Balance: $${balance.toFixed(2)}`,
      );

      return balance;
  }

  async optimizeAndRun() {
    await this.initDB();
    await this.fetchAllSymbols();

    const lessonsPath = path.join(__dirname, 'AI_lessons.md');
    if (fs.existsSync(lessonsPath)) {
       const lessonText = fs.readFileSync(lessonsPath, 'utf-8');
       this.learnedLessons = lessonText.split('\n').filter(l => l.startsWith('- ')).map(l => l.replace('- ', '').trim());
       console.log(`[MEMORY] Loaded ${this.learnedLessons.length} lessons from previous runs.`);
    }
    // await this.syncData();

    fs.writeFileSync(path.join(__dirname, 'backtest_report.txt'), ''); // Clear previous report

    const currentConfig: Config = {
      rsiPeriod: 14,
      rsiLongThreshold: 45, // nới lỏng để có nhiều lệnh hơn
      rsiShortThreshold: 55,
      smaPeriod: 50,
      atrPeriod: 14,
      atrMultiplierSL: 1.5, // Dừng lỗ ngắn hơn để bảo toàn vốn
      atrMultiplierTP: 2.5, // Chốt lời hợp lý hơn
      leverage: 10,
      riskPerTradePercent: 0.02,
      limitOffset: 0.001, // Offset nhỏ lại để dễ khớp lệnh 15m
    };

    const finalBalance = await this.runBacktest(currentConfig, 1);

    console.log(`Backtest complete! Final Balance: ${finalBalance.toFixed(2)}`);
    console.log(
      `Report written to ${path.join(__dirname, 'backtest_report.txt')}`,
    );

    await this.db.end();
  }
}

// Execute
const backtester = new TradingBacktest();
backtester.optimizeAndRun().catch(console.error);
