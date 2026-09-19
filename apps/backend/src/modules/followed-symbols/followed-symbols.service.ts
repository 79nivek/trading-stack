import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { FollowedSymbolRepository } from './followed-symbol.repository';
import { FollowedSymbol } from './followed-symbol.entity';
import {
  CreateFollowedSymbolDto,
  FollowedSymbolDto,
  TokenSuggestionDto,
  Direction,
} from '@trading-stack/shared-dto';

@Injectable()
export class FollowedSymbolsService {
  private readonly logger = new Logger(FollowedSymbolsService.name);
  private readonly BASE_URL = 'https://fapi.binance.com/fapi/v1';

  constructor(
    private readonly followedSymbolRepo: FollowedSymbolRepository,
  ) {}

  async getAll(userId: string): Promise<FollowedSymbolDto[]> {
    const entries = await this.followedSymbolRepo.findByUserId(userId);
    return entries.map(this.toDto);
  }

  async add(
    userId: string,
    dto: CreateFollowedSymbolDto,
  ): Promise<FollowedSymbolDto> {
    const symbol = dto.symbol.toUpperCase();

    const existing = await this.followedSymbolRepo.findByUserIdAndSymbol(
      userId,
      symbol,
    );
    if (existing) {
      throw new BadRequestException(`Symbol ${symbol} is already in your followed list.`);
    }

    const entry = await this.followedSymbolRepo.create(userId, symbol);
    return this.toDto(entry);
  }

  async remove(id: string, userId: string): Promise<void> {
    const entry = await this.followedSymbolRepo.findOneOwned(id, userId);
    if (!entry) {
      throw new NotFoundException(`Followed symbol not found.`);
    }
    await this.followedSymbolRepo.softDelete(id, userId);
  }

  /**
   * Fetches live Binance data (24hr ticker + funding rate) for all followed
   * symbols of a user and returns them as TokenSuggestionDto[].
   */
  async getSymbolsData(userId: string): Promise<TokenSuggestionDto[]> {
    const entries = await this.followedSymbolRepo.findByUserId(userId);
    if (entries.length === 0) return [];

    const symbols = entries.map((e) => e.symbol);

    try {
      const [tickerRes, premiumRes] = await Promise.all([
        axios.get(`${this.BASE_URL}/ticker/24hr`),
        axios.get(`${this.BASE_URL}/premiumIndex`),
      ]);

      const tickerMap = new Map<string, any>();
      tickerRes.data.forEach((t: any) => tickerMap.set(t.symbol, t));

      const premiumMap = new Map<string, any>();
      premiumRes.data.forEach((p: any) => premiumMap.set(p.symbol, p));

      const results: TokenSuggestionDto[] = [];

      for (const sym of symbols) {
        const t = tickerMap.get(sym);
        const p = premiumMap.get(sym);

        if (!t || !p) {
          this.logger.warn(`No Binance data found for symbol: ${sym}`);
          continue;
        }

        const volume24h = parseFloat(t.quoteVolume);
        const priceChangePercent = parseFloat(t.priceChangePercent);
        const tradeCount = parseInt(t.count, 10);
        const fundingRate = parseFloat(p.lastFundingRate);

        const volScore = Math.abs(priceChangePercent) * 2;
        const liqScore = volume24h > 0 ? Math.log10(volume24h) * 5 : 0;
        const activityScore = tradeCount > 0 ? Math.log10(tradeCount) * 2 : 0;
        const fundingScore = Math.abs(fundingRate) * 1000;
        const score = volScore + liqScore + activityScore + fundingScore;

        let reason = '';
        let action: Direction = Direction.NEUTRAL;

        if (fundingRate > 0.001 && priceChangePercent < 0) {
          reason = `Extremely high funding rate (${(fundingRate * 100).toFixed(3)}%) with negative momentum. Potential mean reversion short opportunity.`;
          action = Direction.SHORT;
        } else if (fundingRate < -0.001 && priceChangePercent > 0) {
          reason = `Deeply negative funding rate (${(fundingRate * 100).toFixed(3)}%) with positive momentum. Strong short squeeze potential.`;
          action = Direction.LONG;
        } else if (priceChangePercent > 10 && volume24h > 100_000_000) {
          reason = `High momentum and deep liquidity. Strong upward trend with ${priceChangePercent.toFixed(2)}% price action.`;
          action = Direction.LONG;
        } else if (priceChangePercent < -10 && volume24h > 100_000_000) {
          reason = `High downside momentum and deep liquidity with ${priceChangePercent.toFixed(2)}% price action.`;
          action = Direction.SHORT;
        } else if (Math.abs(fundingRate) > 0.001) {
          reason = `Anomalous funding rate (${(fundingRate * 100).toFixed(3)}%). Potential mean reversion or heavy skew in open interest.`;
          action = fundingRate > 0 ? Direction.SHORT : Direction.LONG;
        } else if (tradeCount > 500_000) {
          reason = `Exceptional market activity. Great for scalping due to tight spreads and high fill rate.`;
          action = priceChangePercent > 0 ? Direction.LONG : Direction.SHORT;
        } else {
          reason = `Solid baseline liquidity with balanced volatility.`;
          action = Direction.NEUTRAL;
        }

        results.push({
          symbol: sym,
          volume24h,
          priceChangePercent,
          fundingRate,
          tradeCount,
          reason,
          action,
          score,
        });
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to fetch Binance data for followed symbols', error);
      throw error;
    }
  }

  /**
   * Persist manual sort order — receives an ordered array of followed-symbol ids.
   */
  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    await this.followedSymbolRepo.updateSortOrders(orderedIds, userId);
  }

  private toDto(entry: FollowedSymbol): FollowedSymbolDto {
    return {
      id: entry.id,
      symbol: entry.symbol,
      userId: entry.userId,
      sortOrder: entry.sortOrder,
      createdAt: entry.createdAt,
    };
  }
}

