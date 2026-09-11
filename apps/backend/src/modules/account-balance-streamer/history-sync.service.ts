import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Spot } from '@binance/spot';
import { DerivativesTradingUsdsFutures } from '@binance/derivatives-trading-usds-futures';
import { SpotTradeService } from '../spot-trade/spot-trade.service';
import { FuturesTradeService } from '../futures-trade/futures-trade.service';

import { Cron } from '@nestjs/schedule';

@Injectable()
export class HistorySyncService {
  private readonly logger = new Logger(HistorySyncService.name);
  private readonly apiKey: string;
  private readonly privateKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly spotTradeService: SpotTradeService,
    private readonly futuresTradeService: FuturesTradeService,
  ) {
    this.apiKey = this.configService.get<string>('BINANCE_API_KEY') || '';
    this.privateKey = (this.configService.get<string>('BINANCE_PRIVATE_KEY') || '').replace(/\\n/g, '\n');
  }

  @Cron('*/30 * * * *') // Mỗi 30 phút
  public async syncFuturesData(): Promise<number> {
    let count = 0;
    if (!this.apiKey || !this.privateKey) return count;

    this.logger.log('Đang đồng bộ dữ liệu Futures lịch sử...');
    const futuresClient = new DerivativesTradingUsdsFutures({
      configurationRestAPI: {
        apiKey: this.apiKey,
        privateKey: this.privateKey,
      },
    });

    try {
      const pnlRes = await futuresClient.restAPI.getIncomeHistory({
        incomeType: 'REALIZED_PNL' as any,
        limit: 1000,
        recvWindow: 60000,
      });
      const pnlData = (await pnlRes.data()) as any[];

      const feeRes = await futuresClient.restAPI.getIncomeHistory({
        incomeType: 'COMMISSION' as any,
        limit: 1000,
        recvWindow: 60000,
      });
      const feeData = (await feeRes.data()) as any[];

      const feesByTrade = new Map<string, { fee: number, asset: string }>();
      for (const f of feeData) {
        if (f.tradeId) {
          const current = feesByTrade.get(f.tradeId.toString()) || { fee: 0, asset: f.asset };
          feesByTrade.set(
            f.tradeId.toString(),
            {
              fee: current.fee + parseFloat(f.income || '0'),
              asset: f.asset
            }
          );
        }
      }

      for (const item of pnlData) {
        const itemTimeMs = Number(item.time);
        const time = new Date(itemTimeMs);
        const symbol = item.symbol;
        const exists = await this.futuresTradeService.findOneBySymbolAndTime(
          symbol,
          time,
        );
        if (!exists) {
          const tradeId = item.tradeId ? item.tradeId.toString() : '';
          const feeInfo = feesByTrade.get(tradeId) || { fee: 0, asset: item.asset || 'USDT' };
          await this.futuresTradeService.saveTrade({
            symbol,
            side: parseFloat(item.income || '0') > 0 ? 'BUY' : 'SELL', // Giả định
            realizedPnl: parseFloat(item.income || '0'),
            fee: -feeInfo.fee, // income is negative for paid commission, so fee (cost) should be positive
            feeAsset: feeInfo.asset,
            timestamp: time,
          });
          count++;
        }
      }
    } catch (err: any) {
      this.logger.error('Lỗi sync futures: ' + err.message);
    }
    if (count > 0) this.logger.log(`✅ Đồng bộ thành công ${count} lệnh Futures.`);
    return count;
  }

  @Cron('0 */6 * * *') // Mỗi 6 tiếng (4 lần 1 ngày)
  public async syncSpotData(): Promise<number> {
    let spotCount = 0;
    if (!this.apiKey || !this.privateKey) return spotCount;

    this.logger.log('Đang đồng bộ dữ liệu Spot lịch sử...');
    try {
      const spotClient = new Spot({
        configurationRestAPI: {
          apiKey: this.apiKey,
          privateKey: this.privateKey,
        },
      });
      const accountRes = await spotClient.restAPI.getAccount({ recvWindow: 60000 });
      const accountData = await accountRes.data();
      const balances = (accountData.balances || []).filter(
        (b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0,
      );

      const symbolsToSync = new Set<string>([
        'BTCUSDT',
        'ETHUSDT',
        'BNBUSDT',
      ]);
      for (const b of balances) {
        if (b.asset !== 'USDT') {
          symbolsToSync.add(`${b.asset}USDT`);
        }
      }

      for (const symbol of symbolsToSync) {
        const tradesRes = await spotClient.restAPI.myTrades({ symbol, recvWindow: 60000 });
        const tradesData = (await tradesRes.data()) as any[];
        for (const item of tradesData) {
          const itemTimeMs = Number(item.time);
          const time = new Date(itemTimeMs);
          const isBuyer = item.isBuyer;
          const qty = parseFloat(item.qty || '0');
          const price = parseFloat(item.price || '0');
          const commission = parseFloat(item.commission || '0');

          const exists = await this.spotTradeService.findOneBySymbolAndTime(
            symbol,
            time,
          );
          if (!exists) {
            await this.spotTradeService.saveTrade({
              symbol,
              side: isBuyer ? 'BUY' : 'SELL',
              fee: commission,
              feeAsset: item.commissionAsset || null,
              price,
              qty,
              timestamp: time,
            });
            spotCount++;
          }
        }
      }
    } catch (err: any) {
      this.logger.error('Lỗi sync spot: ' + err.message);
    }
    if (spotCount > 0) this.logger.log(`✅ Đồng bộ thành công ${spotCount} lệnh Spot.`);
    return spotCount;
  }

  public async syncInitialData() {
    if (!this.apiKey || !this.privateKey) {
      return { status: 'skipped' };
    }
    const futuresSynced = await this.syncFuturesData();
    const spotSynced = await this.syncSpotData();
    return { status: 'success', futuresSynced, spotSynced };
  }
}
