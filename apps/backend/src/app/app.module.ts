import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CONFIGURATION } from '../configuration';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { BinanceCredentialsModule } from '../modules/binance-credentials/binance-credentials.module';
import { UserSettingsModule } from '../modules/user-settings/user-settings.module';
import { SuggestionsModule } from '../modules/suggestions/suggestions.module';
import { TypeOrmModule } from '@nestjs/typeorm';

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
    BinanceCredentialsModule,
    UserSettingsModule,
    SuggestionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
