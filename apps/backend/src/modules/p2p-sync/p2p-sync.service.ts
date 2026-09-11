import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { P2PTradeService } from '../p2p-trade/p2p-trade.service';
import axios from 'axios';
import * as crypto from 'crypto';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class P2PSyncService {
  private readonly logger = new Logger(P2PSyncService.name);
  private readonly apiKey: string;
  private readonly privateKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly p2pTradeService: P2PTradeService,
  ) {
    this.apiKey = this.configService.get<string>('BINANCE_API_KEY') || '';
    this.privateKey = (this.configService.get<string>('BINANCE_PRIVATE_KEY') || '').replace(/\\n/g, '\n');
  }

  @Cron('0 */6 * * *') // Mỗi 6 tiếng (4 lần 1 ngày)
  public async syncP2PHistory(): Promise<number> {
    if (!this.apiKey || !this.privateKey) {
      this.logger.warn('No BINANCE_API_KEY or BINANCE_PRIVATE_KEY provided. Skipping P2P sync.');
      return 0;
    }

    let totalSynced = 0;
    try {
      const tradeTypes = ['BUY', 'SELL'];
      
      const DAY_MS = 24 * 60 * 60 * 1000;
      const endNow = Date.now();
      // Binance only allows past 6 months
      const startLimit = endNow - (180 * DAY_MS);
      
      for (const tradeType of tradeTypes) {
        // Iterate backwards in 30-day chunks
        let currentEnd = endNow;
        while (currentEnd > startLimit) {
          let currentStart = currentEnd - (30 * DAY_MS);
          if (currentStart < startLimit) currentStart = startLimit;
          
          const queryParams = new URLSearchParams({
            tradeType,
            startTimestamp: currentStart.toString(),
            endTimestamp: currentEnd.toString(),
            timestamp: Date.now().toString(),
          });
          const queryString = queryParams.toString();
          const signature = crypto.sign(null, Buffer.from(queryString), this.privateKey).toString('base64');
          
          const url = `https://api.binance.com/sapi/v1/c2c/orderMatch/listUserOrderHistory?${queryString}&signature=${encodeURIComponent(signature)}`;

          const response = await axios.get(url, {
            headers: { 'X-MBX-APIKEY': this.apiKey },
          });

          const data = response.data;
          if (data && data.code === '000000' && Array.isArray(data.data)) {
            for (const item of data.data) {
               const exists = await this.p2pTradeService.findOneByOrderNumber(item.orderNumber);
               if (!exists) {
                  await this.p2pTradeService.saveTrade({
                    orderNumber: item.orderNumber,
                    advNo: item.advNo,
                    tradeType: item.tradeType,
                    asset: item.asset,
                    fiat: item.fiat,
                    fiatSymbol: item.fiatSymbol,
                    amount: parseFloat(item.amount),
                    totalPrice: parseFloat(item.totalPrice),
                    unitPrice: parseFloat(item.unitPrice),
                    orderStatus: item.orderStatus,
                    commission: parseFloat(item.commission || '0'),
                    createTime: new Date(item.createTime),
                  });
                  totalSynced++;
               }
            }
          }
          currentEnd = currentStart - 1;
          await new Promise(resolve => setTimeout(resolve, 500)); // avoid rate limits
        }
      }
      this.logger.log(`✅ Đồng bộ thành công ${totalSynced} đơn hàng P2P trong 6 tháng qua.`);
    } catch (err: any) {
      if (err.response && err.response.data) {
        this.logger.error(`Lỗi khi sync P2P: ${JSON.stringify(err.response.data)}`);
      } else {
        this.logger.error(`Lỗi khi sync P2P: ${err.message}`);
      }
    }
    return totalSynced;
  }
}
