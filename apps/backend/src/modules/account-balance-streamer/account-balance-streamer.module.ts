import { Module } from '@nestjs/common';
import { DiscordWebhookModule } from "../discord-webhook/discord-webhook.module";
import { HistorySyncService } from './history-sync.service';
import { SpotStreamService } from './spot-stream.service';
import { FuturesStreamService } from './futures-stream.service';

@Module({
  imports: [DiscordWebhookModule],
  providers: [HistorySyncService, SpotStreamService, FuturesStreamService],
  exports: [HistorySyncService, SpotStreamService, FuturesStreamService],
})
export class AccountBalanceStreamerModule {}
