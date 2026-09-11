import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CONFIGURATION } from '../configuration';
import { AccountBalanceStreamerModule } from '../modules/account-balance-streamer/account-balance-streamer.module';
import { DiscordWebhookModule } from '../modules/discord-webhook/discord-webhook.module';
import { DatabaseModule } from '../modules/database/database.module';
import { DiscordBotModule } from '../modules/discord-bot/discord-bot.module';
import { P2PSyncModule } from '../modules/p2p-sync/p2p-sync.module';
import { PortfolioValuationModule } from '../modules/portfolio-valuation/portfolio-valuation.module';
import { FuturesScannerModule } from '../modules/futures-scanner/futures-scanner.module';
import { BinanceExecutionModule } from '../modules/binance-execution/binance-execution.module';
import { FollowedTokenModule } from '../modules/followed-token/followed-token.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({ ...CONFIGURATION })],
    }),
    ScheduleModule.forRoot(),
    AccountBalanceStreamerModule,
    DiscordWebhookModule,
    DatabaseModule,
    DiscordBotModule,
    P2PSyncModule,
    PortfolioValuationModule,
    FuturesScannerModule,
    BinanceExecutionModule,
    FollowedTokenModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
