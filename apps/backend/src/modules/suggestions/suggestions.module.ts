import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { BinanceCredentialsModule } from '../binance-credentials/binance-credentials.module';
import { Module } from '@nestjs/common';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';
import { MicrostructureExitService } from './position.service';
import { AnalyzeModule } from '../analyze/analyze.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [BinanceCredentialsModule, AuthModule, UsersModule, AnalyzeModule, LlmModule],
  controllers: [SuggestionsController],
  providers: [SuggestionsService, MicrostructureExitService],
})
export class SuggestionsModule {}
