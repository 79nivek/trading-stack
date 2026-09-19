import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowedSymbol } from './followed-symbol.entity';
import { FollowedSymbolRepository } from './followed-symbol.repository';
import { FollowedSymbolsService } from './followed-symbols.service';
import { FollowedSymbolsController } from './followed-symbols.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FollowedSymbol]),
    AuthModule,
    UsersModule,
  ],
  controllers: [FollowedSymbolsController],
  providers: [FollowedSymbolsService, FollowedSymbolRepository],
  exports: [FollowedSymbolsService],
})
export class FollowedSymbolsModule {}
