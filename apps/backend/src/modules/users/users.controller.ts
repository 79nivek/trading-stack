import { Controller, Get, Patch, Body, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { RequireAuth } from '../../decorators/require-auth.decorator';
import { UpdateUserDto } from '@trading-stack/shared-dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @RequireAuth()
  getMe(@Request() req: any) {
    return req.user;
  }

  @Patch()
  @RequireAuth()
  async updateUser(@Request() req: any, @Body() body: UpdateUserDto) {
    return this.usersService.updateUser(req.user.id, body);
  }
}
