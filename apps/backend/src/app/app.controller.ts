import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { IgnoreLog } from '../core/decorators/ignore-log.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  @IgnoreLog()
  health() {
    return { status: 'ok' };
  }
}
