import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SMA, RSI } from 'technicalindicators';
import { AiCheckResponseDto } from '@trading-stack/shared-dto';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly BINANCE_API = 'https://fapi.binance.com/fapi/v1';
  private readonly OLLAMA_API = 'http://10.0.40.103:11434/api/generate';
  private readonly OLLAMA_MODEL = 'mistral:latest'; // Fits well in 16GB VRAM (8B params), fallback to 'llama3' or 'mistral' if needed.

  async llmCheck(symbol: string, timeFrame = '4h'): Promise<AiCheckResponseDto> {
    try {
      this.logger.log(`Performing LLM Check for ${symbol}`);
      this.logger.log('Fetching Binance data...');

      // 1. Collect Data
      const [tickerRes, premiumRes, klinesRes] = await Promise.all([
        axios.get(`${this.BINANCE_API}/ticker/24hr?symbol=${symbol}`, { timeout: 10000 }),
        axios.get(`${this.BINANCE_API}/premiumIndex?symbol=${symbol}`, { timeout: 10000 }),
        axios.get(`${this.BINANCE_API}/klines?symbol=${symbol}&interval=${timeFrame}&limit=50`, { timeout: 10000 })
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
      const response = await axios.post(this.OLLAMA_API, {
        model: this.OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        format: 'json'
      }, { timeout: 60000 });
      this.logger.log('Ollama response received.');

      const resultText = response.data.response;
      let parsed;
      try {
        parsed = JSON.parse(resultText);
      } catch (e) {
        this.logger.error('Failed to parse LLM JSON', resultText);
        parsed = { action: 'NEUTRAL', reasoning: 'Failed to generate a valid response.' };
      }

      return {
        symbol,
        action: parsed.action || 'NEUTRAL',
        reasoning: parsed.reasoning || 'No reasoning provided.'
      };

    } catch (error) {
      this.logger.error(`LLM Check failed for ${symbol}`, error);
      throw error;
    }
  }
}
