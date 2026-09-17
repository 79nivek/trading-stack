import { Controller, Get, Patch, Body, Request } from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';
import { RequireAuth } from '../../decorators/require-auth.decorator';
import { UpdateSettingsDto } from '@trading-stack/shared-dto';

@Controller('settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get()
  @RequireAuth()
  async getSettings(@Request() req: any) {
    return this.userSettingsService.getSettings(req.user.id);
  }

  @Patch()
  @RequireAuth()
  async updateSettings(@Request() req: any, @Body() body: UpdateSettingsDto) {
    return this.userSettingsService.updateSettings(req.user.id, body);
  }
}
