import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DiscordWebhookService {
  private readonly logger = new Logger(DiscordWebhookService.name);

  constructor(private readonly configService: ConfigService) {}

  private get spotWebhookUrl(): string {
    return this.configService.get<string>('DISCORD_WEBHOOK_SPOT') ?? '';
  }

  private get futuresWebhookUrl(): string {
    return this.configService.get<string>('DISCORD_WEBHOOK_FUTURES') ?? '';
  }

  async sendToSpot(message: string): Promise<void> {
    const url = this.spotWebhookUrl;
    if (!url) return;
    try {
      const content = `${message}\n--------------------------------------`;
      await axios.post(url, { content });
    } catch (error: any) {
      this.logger.error(`[Discord Webhook Spot] Lỗi: ${error.message}`);
    }
  }

  async sendToFutures(message: string): Promise<void> {
    const url = this.futuresWebhookUrl;
    if (!url) return;
    try {
      const content = `${message}\n--------------------------------------`;
      await axios.post(url, { content });
    } catch (error: any) {
      this.logger.error(`[Discord Webhook Futures] Lỗi: ${error.message}`);
    }
  }

  private get futuresEventWebhookUrl(): string {
    return this.configService.get<string>('DISCORD_WEBHOOK_FUTURES_EVENT') ?? this.futuresWebhookUrl;
  }

  async sendToFuturesEvent(message: string): Promise<void> {
    const url = this.futuresEventWebhookUrl;
    if (!url) return;
    try {
      const content = `${message}\n--------------------------------------`;
      await axios.post(url, { content });
    } catch (error: any) {
      this.logger.error(`[Discord Webhook Futures Event] Lỗi: ${error.message}`);
    }
  }
}
