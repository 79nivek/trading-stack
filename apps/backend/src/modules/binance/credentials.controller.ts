import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { BinanceService } from './binance.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { MasterToken } from '../../decorators/master-token.decorator';
import { RequireMasterToken } from '../../decorators/require-master-token.decorator';
import { GetUser } from '../../decorators/user.decorator';
import { User } from '../users/user.entity';
import { CheckBinanceCredentialsDto, SaveBinanceCredentialsDto } from '@trading-stack/shared-dto';
import { IgnoreLog } from '../../core/decorators/ignore-log.decorator';

@Controller('credentials')
@UseGuards(JwtAuthGuard)
export class CredentialsController {
  constructor(
    private readonly binanceService: BinanceService,
  ) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  async check(@Body() checkDto: CheckBinanceCredentialsDto) {
    const permissions = await this.binanceService.checkCredentials(
      checkDto.apiKey,
      checkDto.secretKey,
    );
    return { ok: true, permissions };
  }

  @Post('save')
  @HttpCode(HttpStatus.CREATED)
  async save(@GetUser() user: User, @Body() saveDto: SaveBinanceCredentialsDto) {
    const result = await this.binanceService.saveCredentials(
      user.id,
      saveDto.apiKey,
      saveDto.secretKey,
    );
    return result;
  }

  @Post('master-token/check')
  @HttpCode(HttpStatus.OK)
  @IgnoreLog({ ignoreBody: true })
  async checkToken(@GetUser() user: User, @Body() body: { masterToken: string }) {
    if (!body.masterToken) {
      return { ok: false };
    }
    const permissions = await this.binanceService.checkMasterToken(
      user.id,
      body.masterToken,
    );
    return { ok: true, permissions };
  }

  @Get('listen-key')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async getListenKey(@GetUser() user: User, @MasterToken() masterToken: string) {
    const listenKey = await this.binanceService.getListenKey(
      user.id,
      masterToken,
    );
    return { listenKey };
  }
}
