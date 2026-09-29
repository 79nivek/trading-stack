import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BinanceController } from './binance.controller';
import { BinanceService } from './binance.service';
import { BinanceCredential } from './binance-credential.entity';
import { BinanceCredentialRepository } from './binance-credential.repository';
import { EncryptionModule } from '../encryption/encryption.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CredentialsController } from './credentials.controller';
import { FuturesController } from './futures.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BinanceCredential]),
    EncryptionModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [BinanceController, CredentialsController, FuturesController],
  providers: [BinanceService, BinanceCredentialRepository],
  exports: [BinanceService, BinanceCredentialRepository],
})
export class BinanceModule {}
