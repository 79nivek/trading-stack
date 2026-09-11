import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DerivativesTradingUsdsFutures } from '@binance/derivatives-trading-usds-futures';
import { DiscordWebhookService } from '../discord-webhook/discord-webhook.service';
import { FuturesTradeService } from '../futures-trade/futures-trade.service';

class FuturesOrderSummary {
  symbol = '';
  side: 'BUY' | 'SELL' = 'BUY';
  cumulativeFilledQty = 0;
  averagePrice = 0;
  realizedPnl = 0;
  commissions: Record<string, number> = {};

  addPnl(amount: number) {
    this.realizedPnl += amount;
  }
  addCommission(asset: string, amount: number) {
    if (!this.commissions[asset]) this.commissions[asset] = 0;
    this.commissions[asset] += amount;
  }
}

@Injectable()
export class FuturesStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FuturesStreamService.name);
  private futuresStream: any | null = null;
  private futuresListenKey: string | null = null;
  private futuresActiveOrders = new Map<number, FuturesOrderSummary>();
  private futuresBalances = new Map<string, number>();
  private futuresKeepaliveInterval: NodeJS.Timeout | null = null;
  private futuresReconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private futuresClient: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly discordWebhookService: DiscordWebhookService,
    private readonly futuresTradeService: FuturesTradeService,
  ) {
    this.apiKey = this.configService.get<string>('BINANCE_API_KEY') || '';
    this.apiSecret = (
      this.configService.get<string>('BINANCE_PRIVATE_KEY') || ''
    ).replace(/\\n/g, '\n');
  }

  onModuleInit() {
    if (this.apiKey && this.apiSecret) {
      this.futuresClient = new DerivativesTradingUsdsFutures({
        configurationRestAPI: {
          apiKey: this.apiKey,
          privateKey: this.apiSecret,
        },
        configurationWebsocketStreams: {},
      });
      void this.connectFutures();
    }
  }

  onModuleDestroy() {
    this.isDestroyed = true;
    void this.cleanupFutures();
  }

  private async connectFutures(): Promise<void> {
    try {
      this.logger.log('[FUTURES] Khởi tạo Futures Client & lấy listenKey...');
      const response = await this.futuresClient.restAPI.startUserDataStream();
      const data = await response.data();
      this.futuresListenKey = data.listenKey ?? null;

      if (!this.futuresListenKey)
        throw new Error('Không lấy được listenKey cho Futures');

      const connection = await this.futuresClient.websocketStreams.connect({
        stream: [this.futuresListenKey],
      });
      this.futuresStream = connection.userData(this.futuresListenKey);
      this.futuresStream.on('message', (event: any) =>
        this.handleFuturesEvent(event),
      );

      this.startFuturesKeepalive();
      this.logger.log('✅ [FUTURES] Đã subscribe! Đang theo dõi Futures...');
    } catch (err: any) {
      this.logger.error(`[FUTURES] Lỗi kết nối: ${err.message}`);
      this.scheduleFuturesReconnect();
    }
  }

  private handleFuturesEvent(event: any): void {
    if (!event || !event.e) return;
    switch (event.e) {
      case 'ORDER_TRADE_UPDATE':
        this.onFuturesOrderUpdate(event);
        break;
      case 'ACCOUNT_UPDATE':
        this.onFuturesAccountUpdate(event);
        break;
      case 'listenKeyExpired':
        void this.cleanupFutures(false).then(() => this.connectFutures());
        break;
    }
  }

  private onFuturesOrderUpdate(event: any): void {
    const orderId = event.o.i;
    let summary = this.futuresActiveOrders.get(orderId);

    if (!summary) {
      summary = new FuturesOrderSummary();
      summary.symbol = event.o.s;
      summary.side = event.o.S;
      this.futuresActiveOrders.set(orderId, summary);
    }

    summary.cumulativeFilledQty = parseFloat(event.o.z);
    summary.averagePrice = parseFloat(event.o.ap);

    const realizedPnl = parseFloat(event.o.rp);
    if (realizedPnl !== 0) summary.addPnl(realizedPnl);

    const commission = parseFloat(event.o.n);
    if (commission !== 0 && event.o.N)
      summary.addCommission(event.o.N, commission);

    if (['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(event.o.X)) {
      this.logFuturesTradeSummary(event.o.X, summary);
      this.futuresActiveOrders.delete(orderId);
    }
  }

  private logFuturesTradeSummary(status: string, summary: FuturesOrderSummary) {
    if (summary.cumulativeFilledQty === 0) return;
    setTimeout(() => {
      const pnlStr =
        summary.realizedPnl !== 0
          ? ` | ${summary.realizedPnl > 0 ? '🟩 LÃI' : '🟥 LỖ'}: ${summary.realizedPnl.toFixed(4)} USDT`
          : '';
      let fees = '';
      if (Object.keys(summary.commissions).length > 0) {
        fees = Object.entries(summary.commissions)
          .map(([asset, amount]) => `${amount.toFixed(6)} ${asset}`)
          .join(', ');
      }
      const feeStr = fees ? ` | 💸 Phí: ${fees}` : '';

      const msg = `[FUTURES TRADE - ${summary.side} ${summary.symbol}] Status: ${status} | Khớp: ${summary.cumulativeFilledQty} @ ${summary.averagePrice}${pnlStr}${feeStr}`;
      this.logger.log(msg);
      void this.discordWebhookService.sendToFutures(msg);

      void this.futuresTradeService
        .saveTrade({
          symbol: summary.symbol,
          side: summary.side,
          realizedPnl: summary.realizedPnl,
          fee: Object.values(summary.commissions).reduce((a, b) => a + b, 0),
          feeAsset: Object.keys(summary.commissions)[0] || null,
          price: summary.averagePrice,
          qty: summary.cumulativeFilledQty,
          timestamp: new Date(),
        })
        .catch((err) => this.logger.error('Lỗi lưu Futures Trade vào DB', err));
    }, 100);
  }

  private onFuturesAccountUpdate(event: any): void {
    const reason = event.a.m;
    for (const bal of event.a.B)
      this.futuresBalances.set(bal.a, parseFloat(bal.wb));
    if (reason === 'ORDER') return;

    for (const bal of event.a.B) {
      const change = parseFloat(bal.bc);
      if (change === 0) continue;
      const sign = change > 0 ? '+' : '';
      const msg = `[FUTURES EVENT] 📌 Biến động (${reason}) | ${sign}${change.toFixed(4)} ${bal.a} | Số dư mới: ${parseFloat(bal.wb).toFixed(4)}`;
      this.logger.log(msg);
      void this.discordWebhookService.sendToFutures(msg);
    }
  }

  private startFuturesKeepalive(): void {
    if (this.futuresKeepaliveInterval)
      clearInterval(this.futuresKeepaliveInterval);
    this.futuresKeepaliveInterval = setInterval(
      async () => {
        if (!this.futuresClient || !this.futuresListenKey || this.isDestroyed)
          return;
        try {
          await this.futuresClient.restAPI.keepaliveUserDataStream();
        } catch (err: any) {
          this.logger.error('Lỗi keepalive Futures: ' + err.message);
        }
      },
      30 * 60 * 1000,
    );
  }

  private scheduleFuturesReconnect(): void {
    if (this.futuresReconnectTimer) return;
    this.futuresReconnectTimer = setTimeout(() => {
      this.futuresReconnectTimer = null;
      if (!this.isDestroyed) void this.connectFutures();
    }, 5000);
  }

  private async cleanupFutures(clearKeepalive = true): Promise<void> {
    if (clearKeepalive && this.futuresKeepaliveInterval)
      clearInterval(this.futuresKeepaliveInterval);
    if (this.futuresReconnectTimer) clearTimeout(this.futuresReconnectTimer);
    if (this.futuresStream) {
      try {
        this.futuresStream.unsubscribe();
      } catch (err: any) {
        this.logger.error('Lỗi cleanup Futures: ' + err.message);
      }
    }
    this.futuresActiveOrders.clear();
  }
}
