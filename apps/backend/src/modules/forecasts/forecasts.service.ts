import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForecastDto, ForecastParamsDto } from '@trading-stack/shared-dto';
import axios, { AxiosInstance } from 'axios';
import { UserSettingsService } from '../user-settings/user-settings.service';

@Injectable()
export class ForecastsService {
  private readonly forecastClient: AxiosInstance;

  constructor(
    private confiService: ConfigService,
    private userSettingServ: UserSettingsService,
  ) {
    const XGBOOST_URL = this.confiService.get<string>(
      'XGBOOST_URL',
      'http://localhost:8000',
    );

    this.forecastClient = axios.create({
      baseURL: XGBOOST_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async futures(userId: string, params: ForecastParamsDto) {
    try {
      if (!params.timeFrame) {
        const userSetings = await this.userSettingServ.getSettings(userId);
        params.timeFrame = userSetings.timeFrame || '5m';
      }

      if(!params.limit) {
        params.limit = 10;
      }

      const res = await this.forecastClient.get<{
        success: boolean;
        symbol: string;
        timeFrame: string;
        quantity: number;
        forecasts: ForecastDto[];
        message: string;
      }>('/api/v1/forecast/futures', {
        params: {
          symbol: params.symbol.toUpperCase(),
          timeFrame: params.timeFrame,
          quantity: params.limit,
        },
      });

      if (res.data.success) {
        return res.data.forecasts;
      } else {
        throw new Error(res.data.message);
      }
    } catch (error) {
      throw new ServiceUnavailableException(error);
    }
  }
}
