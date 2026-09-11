import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowedToken } from './followed-token.entity';
import { FuturesTradeService } from '../futures-trade/futures-trade.service';
import { TokenOpportunity } from '../futures-scanner/futures-scanner.service';

@Injectable()
export class FollowedTokenService {
  private readonly logger = new Logger(FollowedTokenService.name);

  constructor(
    @InjectRepository(FollowedToken)
    private readonly repo: Repository<FollowedToken>,
    private readonly futuresTradeService: FuturesTradeService,
  ) {}

  async getFollowedTokens(): Promise<Partial<TokenOpportunity>[]> {
    const tokens = await this.repo.find({ order: { createdAt: 'DESC' } });
    
    const results: Partial<TokenOpportunity>[] = [];
    for (const token of tokens) {
      const lastExitPrice = await this.futuresTradeService.findLastExitPrice(token.symbol);
      results.push({
        symbol: token.symbol,
        lastExitPrice: lastExitPrice || undefined,
        // We only populate symbol and lastExitPrice. The frontend chart component mainly needs these.
      });
    }
    return results;
  }

  async addToken(symbol: string): Promise<void> {
    const s = symbol.toUpperCase();
    const existing = await this.repo.findOne({ where: { symbol: s } });
    if (!existing) {
      const entity = this.repo.create({ symbol: s });
      await this.repo.save(entity);
      this.logger.log(`Added ${s} to followed tokens`);
    }
  }

  async removeToken(symbol: string): Promise<void> {
    const s = symbol.toUpperCase();
    await this.repo.delete({ symbol: s });
    this.logger.log(`Removed ${s} from followed tokens`);
  }
}
