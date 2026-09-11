import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { DiscordBotService } from './discord-bot.service';
import { PortfolioValuationModule } from '../portfolio-valuation/portfolio-valuation.module';
import { AccountBalanceStreamerModule } from '../account-balance-streamer/account-balance-streamer.module';
import { P2PSyncModule } from '../p2p-sync/p2p-sync.module';
import { FuturesScannerModule } from '../futures-scanner/futures-scanner.module';
import { BinanceExecutionModule } from '../binance-execution/binance-execution.module';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        token: config.get<string>('DISCORD_TOKEN') || '',
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.GuildMessages,
          IntentsBitField.Flags.MessageContent,
        ],
      }),
      inject: [ConfigService],
    }),
    PortfolioValuationModule,
    AccountBalanceStreamerModule,
    P2PSyncModule,
    FuturesScannerModule,
    BinanceExecutionModule,
  ],
  providers: [DiscordBotService],
})
export class DiscordBotModule {}
