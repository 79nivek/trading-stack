import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { BinanceModule } from '../binance/binance.module';
import { Module } from '@nestjs/common';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';
import { MicrostructureExitService } from './position.service';
import { AnalyzeModule } from '../analyze/analyze.module';
import { LlmModule } from '../llm/llm.module';
import { UserSettingsModule } from '../user-settings/user-settings.module';

@Module({
  imports: [
    BinanceModule,
    AuthModule,
    UsersModule,
    AnalyzeModule,
    LlmModule,
    UserSettingsModule,
  ],
  controllers: [SuggestionsController],
  providers: [SuggestionsService, MicrostructureExitService],
})
export class SuggestionsModule {}
