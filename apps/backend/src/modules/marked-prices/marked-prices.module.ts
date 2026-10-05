import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarkedPrice } from './marked-price.entity';
import { MarkedPricesController } from './marked-prices.controller';
import { MarkedPricesService } from './marked-prices.service';
import { MarkedPriceRepository } from './marked-price.repository';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([MarkedPrice]), UsersModule, AuthModule],
  controllers: [MarkedPricesController],
  providers: [MarkedPricesService, MarkedPriceRepository],
  exports: [MarkedPricesService],
})
export class MarkedPricesModule {}
