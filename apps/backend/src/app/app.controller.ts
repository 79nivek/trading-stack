import { Controller, Get, Param, Post, Delete, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
