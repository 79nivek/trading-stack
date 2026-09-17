import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BinanceCredentialsController } from './binance-credentials.controller';
import { BinanceCredentialsService } from './binance-credentials.service';
import { BinanceCredential } from './binance-credential.entity';
import { BinanceCredentialRepository } from './binance-credential.repository';
import { EncryptionModule } from '../encryption/encryption.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BinanceCredential]),
    EncryptionModule,
    AuthModule,
    UsersModule
  ],
  controllers: [BinanceCredentialsController],
  providers: [
    BinanceCredentialsService,
    BinanceCredentialRepository
  ],
  exports: [BinanceCredentialsService, BinanceCredentialRepository]
})
export class BinanceCredentialsModule {}
