import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyzeService } from './analyze.service';
import { AnalyzeController } from './analyze.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { UserSettingsModule } from '../user-settings/user-settings.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    // TypeOrmModule.forFeature([FollowedSymbol]),
    AuthModule,
    UsersModule,
    MarketDataModule,
    UserSettingsModule,
    LlmModule
  ],
  controllers: [AnalyzeController],
  providers: [AnalyzeService],
  exports: [AnalyzeService],
})
export class AnalyzeModule {}
