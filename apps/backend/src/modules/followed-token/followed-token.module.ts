import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowedToken } from './followed-token.entity';
import { FollowedTokenService } from './followed-token.service';
import { FollowedTokenController } from './followed-token.controller';
import { FuturesTradeModule } from '../futures-trade/futures-trade.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FollowedToken]),
    FuturesTradeModule,
  ],
  controllers: [FollowedTokenController],
  providers: [FollowedTokenService],
  exports: [FollowedTokenService],
})
export class FollowedTokenModule {}
