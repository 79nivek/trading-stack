import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { BinanceCredentialsModule } from '../binance-credentials/binance-credentials.module';
import { Module } from '@nestjs/common';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';
import { LlmService } from './llm.service';
import { MicrostructureExitService } from './position.service';

@Module({
  imports: [
    BinanceCredentialsModule,
    AuthModule,
    UsersModule
  ],
  controllers: [SuggestionsController],
  providers: [SuggestionsService, LlmService, MicrostructureExitService],
})
export class SuggestionsModule {}
