import { Module } from '@nestjs/common';
import { ForecastsController } from './forecasts.controller';
import { ForecastsService } from './forecasts.service';
import { UserSettingsModule } from '../user-settings/user-settings.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule, UserSettingsModule],
  controllers: [ForecastsController],
  providers: [ForecastsService],
  exports: [ForecastsService],
})
export class ForecastsModule {}
