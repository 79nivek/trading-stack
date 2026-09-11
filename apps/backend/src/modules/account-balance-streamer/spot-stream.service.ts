import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Spot } from '@binance/spot';
import { DiscordWebhookService } from '../discord-webhook/discord-webhook.service';
import { SpotTradeService } from '../spot-trade/spot-trade.service';

type SpotStream = any;

class SpotOrderSummary {
  symbol = '';
  side: 'BUY' | 'SELL' = 'BUY';
  cumulativeFilledBase = 0;
  cumulativeFilledQuote = 0;
  commissions: Record<string, number> = {};

  addCommission(asset: string, amount: number) {
    if (!this.commissions[asset]) this.commissions[asset] = 0;
    this.commissions[asset] += amount;
  }
}

@Injectable()
export class SpotStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SpotStreamService.name);
  private spotWsApi: any = null;
  private spotStream: SpotStream | null = null;
  private spotActiveOrders = new Map<number, SpotOrderSummary>();
  private spotKeepaliveInterval: NodeJS.Timeout | null = null;
  private spotReconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  private readonly apiKey: string;
  private readonly privateKey: string;
  private spotClient: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly discordWebhookService: DiscordWebhookService,
    private readonly spotTradeService: SpotTradeService,
  ) {
    this.apiKey = this.configService.get<string>('BINANCE_API_KEY') || '';
    this.privateKey = (this.configService.get<string>('BINANCE_PRIVATE_KEY') || '').replace(/\\n/g, '\n');
  }

  onModuleInit() {
    if (this.apiKey && this.privateKey) {
      this.spotClient = new Spot({
        configurationRestAPI: {
          apiKey: this.apiKey,
          privateKey: this.privateKey,
        },
        configurationWebsocketAPI: {
          apiKey: this.apiKey,
          privateKey: this.privateKey,
        },
      });
      void this.connectSpot();
    }
  }

  onModuleDestroy() {
    this.isDestroyed = true;
    void this.cleanupSpot();
  }

  private async connectSpot(): Promise<void> {
    try {
      this.logger.log('[SPOT] Khởi tạo Spot Client & kết nối WebSocket API...');

      const wsApi = await this.spotClient.websocketAPI.connect();
      await wsApi.sessionLogon();
      this.logger.log(
        '✅ [SPOT] Logon thành công. Đang subscribe UserDataStream...',
      );

      const { stream } = await wsApi.userDataStreamSubscribe();
      this.spotStream = stream;

      this.spotStream.on('message', (event: any) =>
        this.handleSpotEvent(event),
      );

      this.spotWsApi = wsApi; // Store to use for keepalive if needed
      this.startSpotKeepalive();
      this.logger.log('✅ [SPOT] Đã subscribe! Đang theo dõi Spot...');
    } catch (err: any) {
      this.logger.error(`[SPOT] Lỗi kết nối: ${err.message}`);
      this.scheduleSpotReconnect();
    }
  }

  private handleSpotEvent(event: any): void {
    if (!event || !event.e) return;

    switch (event.e) {
      case 'executionReport':
        this.onSpotExecutionReport(event);
        break;
      case 'outboundAccountPosition':
        this.onSpotAccountUpdate(event);
        break;
    }
  }

  private onSpotExecutionReport(event: any): void {
    const orderId = event.i;
    let summary = this.spotActiveOrders.get(orderId);

    if (!summary) {
      summary = new SpotOrderSummary();
      summary.symbol = event.s;
      summary.side = event.S;
      this.spotActiveOrders.set(orderId, summary);
    }

    const lastFilledBase = parseFloat(event.l);
    const lastFilledQuote = parseFloat(event.Y);
    const commissionAmount = parseFloat(event.n);
    const commissionAsset = event.N;

    if (lastFilledBase > 0) {
      summary.cumulativeFilledBase += lastFilledBase;
      summary.cumulativeFilledQuote += lastFilledQuote;
      if (commissionAmount > 0 && commissionAsset) {
        summary.addCommission(commissionAsset, commissionAmount);
      }
    }

    if (['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(event.X)) {
      this.logSpotTradeSummary(event.X, summary);
      this.spotActiveOrders.delete(orderId);
    }
  }

  private logSpotTradeSummary(status: string, summary: SpotOrderSummary) {
    if (summary.cumulativeFilledBase === 0) return;
    setTimeout(() => {
      let fees = '';
      if (Object.keys(summary.commissions).length > 0) {
        fees = Object.entries(summary.commissions)
          .map(([asset, amount]) => `${amount.toFixed(6)} ${asset}`)
          .join(', ');
      }
      const feeStr = fees ? ` | 💸 Phí: ${fees}` : '';

      const qty = summary.cumulativeFilledBase;
      const price = qty > 0 ? summary.cumulativeFilledQuote / qty : 0;
      const msg = `[SPOT TRADE - ${summary.side} ${summary.symbol}] Status: ${status} | Khớp: ${qty} @ ${price.toFixed(4)}${feeStr}`;
      this.logger.log(msg);
      void this.discordWebhookService.sendToSpot(msg);

      void this.spotTradeService
        .saveTrade({
          symbol: summary.symbol,
          side: summary.side,
          fee: Object.values(summary.commissions).reduce((a, b) => a + b, 0),
          feeAsset: Object.keys(summary.commissions)[0] || null,
          price,
          qty,
          timestamp: new Date(),
        })
        .catch((err) => this.logger.error('Lỗi lưu Spot Trade vào DB', err));
    }, 100);
  }

  private onSpotAccountUpdate(event: any): void {
    for (const bal of event.B) {
      const msg = `[SPOT ACCOUNT] 📌 Biến động | ${bal.a}: ${parseFloat(bal.f).toFixed(4)} (Free) / ${parseFloat(bal.l).toFixed(4)} (Locked)`;
      this.logger.log(msg);
    }
  }

  private startSpotKeepalive(): void {
    if (this.spotKeepaliveInterval) clearInterval(this.spotKeepaliveInterval);
    this.spotKeepaliveInterval = setInterval(
      async () => {
        if (!this.spotWsApi || this.isDestroyed) return;
        try {
          await this.spotWsApi.ping();
        } catch (err: any) {
          this.logger.error('[SPOT] Lỗi ping:', err.message);
        }
      },
      10 * 60 * 1000,
    ); // ping every 10 minutes
  }

  private scheduleSpotReconnect(): void {
    if (this.spotReconnectTimer) return;
    this.spotReconnectTimer = setTimeout(() => {
      this.spotReconnectTimer = null;
      if (!this.isDestroyed) void this.connectSpot();
    }, 5000);
  }

  private async cleanupSpot(): Promise<void> {
    if (this.spotKeepaliveInterval) clearInterval(this.spotKeepaliveInterval);
    if (this.spotReconnectTimer) clearTimeout(this.spotReconnectTimer);
    if (this.spotStream) {
      try {
        this.spotStream.unsubscribe();
      } catch (err: any) {
        this.logger.error('[SPOT] Lỗi unsubscribe:', err.message);
      }
    }
    this.spotActiveOrders.clear();
  }
}
