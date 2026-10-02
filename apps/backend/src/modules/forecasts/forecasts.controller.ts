import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { ForecastsService } from './forecasts.service';
import { RequireAuth } from '../../decorators/require-auth.decorator';
import { ForecastDto, ForecastParamsDto } from '@trading-stack/shared-dto';
import { GetUser } from '../../decorators/user.decorator';
import { User } from '../users/user.entity';

@Controller('forecasts')
@UseGuards(JwtAuthGuard)
export class ForecastsController {
  constructor(private readonly forecastsService: ForecastsService) {}

  @Get('futures')
  @RequireAuth()
  async futures(
    @Query() params: ForecastParamsDto,
    @GetUser() user: User,
  ): Promise<ForecastDto[]> {
    return this.forecastsService.futures(user.id, params);
  }

  // @Get('spot')
  // @RequireAuth()
  // async spot(){

  //   return this.forecastsService.spot()

  // }
}
