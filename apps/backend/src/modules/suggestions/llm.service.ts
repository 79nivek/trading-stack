import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SMA, RSI } from 'technicalindicators';
import {
  AiCheckResponseDto,
  Direction,
  PositionSetupDto,
} from '@trading-stack/shared-dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly BINANCE_API = 'https://fapi.binance.com/fapi/v1';
  private OLLAMA_API!: string;
  private OLLAMA_MODEL!: string; // Fits well in 16GB VRAM (8B params), fallback to 'llama3' or 'mistral' if needed.

  constructor(private readonly configServ: ConfigService) {
    const OLLAMA_HOST = this.configServ.get('OLLAMA_HOST', '');
    this.OLLAMA_API = `${OLLAMA_HOST}/api/generate`;
    this.OLLAMA_MODEL = this.configServ.get('OLLAMA_MODEL', '');
  }

  async llmCheck(
    symbol: string,
    timeFrame = '4h',
  ): Promise<AiCheckResponseDto> {
    try {
      this.logger.log(`Performing LLM Check for ${symbol}`);
      this.logger.log('Fetching Binance data...');

      // 1. Collect Data
      const [tickerRes, premiumRes, klinesRes] = await Promise.all([
        axios.get(`${this.BINANCE_API}/ticker/24hr?symbol=${symbol}`, {
          timeout: 10000,
        }),
        axios.get(`${this.BINANCE_API}/premiumIndex?symbol=${symbol}`, {
          timeout: 10000,
        }),
        axios.get(
          `${this.BINANCE_API}/klines?symbol=${symbol}&interval=${timeFrame}&limit=50`,
          { timeout: 10000 },
        ),
      ]);
      this.logger.log('Binance data fetched successfully.');

      const ticker = tickerRes.data;
      const premium = premiumRes.data;
      const klines = klinesRes.data;

      const closes = klines.map((k: any) => parseFloat(k[4]));
      const currentPrice = closes[closes.length - 1];

      // 2. Calculate Indicators using technicalindicators
      const rsi = RSI.calculate({ values: closes, period: 14 });
      const sma20 = SMA.calculate({ values: closes, period: 20 });

      const currentRsi = rsi.length > 0 ? rsi[rsi.length - 1] : null;
      const currentSma = sma20.length > 0 ? sma20[sma20.length - 1] : null;

      const dataContext = `
        Symbol: ${symbol}
        Current Price: ${currentPrice}
        24h Price Change: ${ticker.priceChangePercent}%
        24h Volume: ${ticker.quoteVolume} USDT
        Funding Rate: ${(parseFloat(premium.lastFundingRate) * 100).toFixed(4)}%
        RSI (14, ${timeFrame}): ${currentRsi ? currentRsi.toFixed(2) : 'N/A'}
        SMA (20, ${timeFrame}): ${currentSma ? currentSma.toFixed(2) : 'N/A'}
      `;

      // 3. Query LLM
      const prompt = `You are an expert quantitative crypto trader. Analyze the following data for ${symbol} focusing specifically on the ${timeFrame} timeframe.
      Your trading recommendation (LONG, SHORT, or NEUTRAL) must be tailored to the duration and volatility typical of a ${timeFrame} chart.

      Context Data:
      ${dataContext}

      Output your response STRICTLY as a valid JSON object with the following structure, and no additional text or markdown formatting:
      {
        "action": "LONG" | "SHORT" | "NEUTRAL",
        "reasoning": "Detailed expert explanation of why this action is recommended specifically for the ${timeFrame} timeframe based on the provided technical data."
      }`;

      this.logger.log('Sending request to Ollama API: ' + this.OLLAMA_API);
      const response = await axios.post(
        this.OLLAMA_API,
        {
          model: this.OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          format: 'json',
        },
        { timeout: 60000 },
      );
      this.logger.log('Ollama response received.');

      const resultText = response.data.response;
      let parsed;
      try {
        parsed = JSON.parse(resultText);
      } catch (e) {
        this.logger.error('Failed to parse LLM JSON', resultText);
        parsed = {
          action: 'NEUTRAL',
          reasoning: 'Failed to generate a valid response.',
        };
      }

      return {
        symbol,
        action: parsed.action || 'NEUTRAL',
        reasoning: parsed.reasoning || 'No reasoning provided.',
      };
    } catch (error) {
      this.logger.error(`LLM Check failed for ${symbol}`, error);
      throw error;
    }
  }

  async llmPosition(
    symbol: string,
    balance: number,
  ): Promise<PositionSetupDto> {
    try {
      const [tickerRes, premiumRes, klinesRes] = await Promise.all([
        axios.get(`${this.BINANCE_API}/ticker/24hr?symbol=${symbol}`, {
          timeout: 10000,
        }),
        axios.get(`${this.BINANCE_API}/premiumIndex?symbol=${symbol}`, {
          timeout: 10000,
        }),
        axios.get(
          `${this.BINANCE_API}/klines?symbol=${symbol}&interval=4h&limit=50`,
          { timeout: 10000 },
        ),
      ]);

      const ticker = tickerRes.data;
      const premium = premiumRes.data;
      const klines = klinesRes.data;

      const closes = klines.map((k: any) => parseFloat(k[4]));
      const currentPrice = closes[closes.length - 1];
      const rsi = RSI.calculate({ values: closes, period: 14 });
      const sma20 = SMA.calculate({ values: closes, period: 20 });

      const currentRsi = rsi.length > 0 ? rsi[rsi.length - 1] : null;
      const currentSma = sma20.length > 0 ? sma20[sma20.length - 1] : null;

      const dataContext = `
        Symbol: ${symbol}
        Current Price: ${currentPrice}
        24h Price Change: ${ticker.priceChangePercent}%
        Funding Rate: ${(parseFloat(premium.lastFundingRate) * 100).toFixed(4)}%
        RSI (14, 4h): ${currentRsi ? currentRsi.toFixed(2) : 'N/A'}
        SMA (20, 4h): ${currentSma ? currentSma.toFixed(2) : 'N/A'}
        User Balance: ${balance} USDT
      `;

      const prompt = `You are an expert quantitative crypto trader. Create a detailed trading position setup for ${symbol}.

      Context Data:
      ${dataContext}

      You must manage risk strictly. Do not risk more than 2% to 5% of the User Balance on a single trade.
      CRITICAL RULE: Binance requires the order notional value (volume * entryPrice) to be at least 6 USDT. You MUST ensure volume * entryPrice >= 6. If your calculated volume is too small, increase it until volume * entryPrice = 6.

      Output your response STRICTLY as a valid JSON object matching the following structure exactly, without markdown:
      {
        "strategyName": "LLM Expert Setup",
        "direction": "LONG" | "SHORT" | "NEUTRAL",
        "leverage": number (e.g. 10),
        "margin": number (USDT amount allocated),
        "volume": number (number of contracts/coins),
        "entryType": "MARKET" | "LIMIT",
        "entryPrice": number,
        "takeProfitPrice": number,
        "stopLossPrice": number,
        "estimatedProfit": number (USDT),
        "estimatedLoss": number (USDT),
        "reasoning": "Detailed expert explanation."
      }`;

      const response = await axios.post(
        this.OLLAMA_API,
        {
          model: this.OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          format: 'json',
        },
        { timeout: 60000 },
      );

      const parsed = JSON.parse(response.data.response) as PositionSetupDto;

      // Safety fallback to guarantee min notional
      if (parsed.direction !== Direction.NEUTRAL && parsed.volume > 0) {
        if (parsed.volume * parsed.entryPrice < 6) {
          parsed.volume = 6 / parsed.entryPrice;
          parsed.margin = 6 / parsed.leverage;
          parsed.estimatedLoss =
            parsed.volume * Math.abs(parsed.entryPrice - parsed.stopLossPrice);
          parsed.estimatedProfit =
            parsed.volume *
            Math.abs(parsed.entryPrice - parsed.takeProfitPrice);
          parsed.reasoning +=
            ' (Note: LLM volume bumped to meet Binance $5 notional min)';
        }
      }

      return parsed;
    } catch (error) {
      this.logger.error(`LLM Position failed for ${symbol}`, error);
      throw error;
    }
  }
}
