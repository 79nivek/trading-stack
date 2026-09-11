import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Spot } from '@binance/spot';
import { DerivativesTradingUsdsFutures } from '@binance/derivatives-trading-usds-futures';

@Injectable()
export class PortfolioValuationService implements OnModuleInit {
  private readonly logger = new Logger(PortfolioValuationService.name);
  private cachedTotalSpotUsdt = 0;
  private cachedTotalFuturesUsdt = 0;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    // Run an initial valuation shortly after boot
    setTimeout(() => this.calculateValuation(), 5000);
  }

  public getTotalAssetValue(): { spot: number, futures: number, total: number } {
    return {
      spot: this.cachedTotalSpotUsdt,
      futures: this.cachedTotalFuturesUsdt,
      total: this.cachedTotalSpotUsdt + this.cachedTotalFuturesUsdt,
    };
  }

  @Cron('*/5 * * * *')
  public async calculateValuation() {
    const apiKey = this.configService.get<string>('BINANCE_API_KEY');
    const privateKey = (this.configService.get<string>('BINANCE_PRIVATE_KEY') || '').replace(/\\n/g, '\n');

    if (!apiKey || !privateKey) return;

    try {
      // --- Spot Valuation ---
      const spotClient = new Spot({
        configurationRestAPI: { apiKey, privateKey }
      });
      
      const [accountRes, pricesRes] = await Promise.all([
        spotClient.restAPI.getAccount(),
        spotClient.restAPI.tickerPrice()
      ]);
      
      const accountData = await accountRes.data();
      const balances = (accountData.balances || []).filter((b: any) => parseFloat(b.free || '0') > 0 || parseFloat(b.locked || '0') > 0);
      
      const pricesData = await pricesRes.data();
      const prices = Array.isArray(pricesData) ? pricesData : [];
      const priceMap = new Map<string, number>();
      for (const p of prices as any[]) {
        if (p.symbol && p.price) {
          priceMap.set(p.symbol, parseFloat(p.price));
        }
      }

      let totalSpotUsdt = 0;
      for (const b of balances) {
        const amount = parseFloat(b.free || '0') + parseFloat(b.locked || '0');
        if (b.asset === 'USDT') {
          totalSpotUsdt += amount;
        } else {
          const symbol = `${b.asset}USDT`;
          const price = priceMap.get(symbol) || 0;
          totalSpotUsdt += amount * price;
        }
      }
      this.cachedTotalSpotUsdt = totalSpotUsdt;

      // --- Futures Valuation ---
      const futuresClient = new DerivativesTradingUsdsFutures({
        configurationRestAPI: { apiKey, privateKey }
      });
      const futuresRes = await futuresClient.restAPI.accountInformationV3();
      const futuresData = await futuresRes.data();
      const totalMarginBalance = parseFloat((futuresData as any).totalMarginBalance || '0');
      
      this.cachedTotalFuturesUsdt = totalMarginBalance;

      this.logger.log(`Valuation Updated: Spot ~${this.cachedTotalSpotUsdt.toFixed(2)} USDT, Futures ~${this.cachedTotalFuturesUsdt.toFixed(2)} USDT`);
    } catch (err: any) {
      this.logger.error(`Error calculating valuation: ${err.message}`);
    }
  }
}
