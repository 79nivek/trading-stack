import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CONFIGURATION } from '../configuration';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { BinanceModule } from '../modules/binance/binance.module';
import { UserSettingsModule } from '../modules/user-settings/user-settings.module';
import { SuggestionsModule } from '../modules/suggestions/suggestions.module';
import { FollowedSymbolsModule } from '../modules/followed-symbols/followed-symbols.module';
import { MarketDataModule } from '../modules/market-data/market-data.module';
// import { PositionModule } from '../modules/position/position.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { LoggerInterceptor } from '../core/interceptors/logger.interceptor';
import { TransformInterceptor } from '../core/interceptors/transform.interceptor';
import { ForecastsModule } from '../modules/forecasts/forecasts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({ ...CONFIGURATION })],
    }),
    ScheduleModule.forRoot(),
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

    AuthModule,
    UsersModule,
    BinanceModule,
    UserSettingsModule,
    SuggestionsModule,
    FollowedSymbolsModule,
    MarketDataModule,
    ForecastsModule,
    // PositionModule,

    RouterModule.register([
      {
        path: 'binance',
        module: BinanceModule,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    },
  ],
})
export class AppModule {}
