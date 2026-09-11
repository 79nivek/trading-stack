import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SpotTradeModule } from '../spot-trade/spot-trade.module';
import { FuturesTradeModule } from '../futures-trade/futures-trade.module';
import { P2PTradeModule } from '../p2p-trade/p2p-trade.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST'),
        port: parseInt(config.get<string>('POSTGRES_PORT') || '5432', 10),
        username: config.get<string>('POSTGRES_USER'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB'),
        autoLoadEntities: true,
        synchronize: true, // auto create tables (suitable for dev/simple apps)
      }),
    }),
    SpotTradeModule,
    FuturesTradeModule,
    P2PTradeModule,
  ],
  exports: [TypeOrmModule, SpotTradeModule, FuturesTradeModule, P2PTradeModule],
})
export class DatabaseModule {}
