import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { BinanceCredentialsService } from './binance-credentials.service';
import {
  CheckBinanceCredentialsDto,
  SaveBinanceCredentialsDto,
} from '@trading-stack/shared-dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { MasterToken } from '../../decorators/master-token.decorator';
import { RequireMasterToken } from '../../decorators/require-master-token.decorator';
import { IgnoreLog } from '../../core/decorators/ignore-log.decorator';

@Controller('binance-credentials')
@UseGuards(JwtAuthGuard)
export class BinanceCredentialsController {
  constructor(
    private readonly binanceCredentialsService: BinanceCredentialsService,
  ) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  async check(@Body() checkDto: CheckBinanceCredentialsDto) {
    const permissions = await this.binanceCredentialsService.checkCredentials(
      checkDto.apiKey,
      checkDto.secretKey,
    );
    return { ok: true, permissions };
  }

  @Post('save')
  @HttpCode(HttpStatus.CREATED)
  async save(@Request() req: any, @Body() saveDto: SaveBinanceCredentialsDto) {
    const userId = req.user.id;
    const result = await this.binanceCredentialsService.saveCredentials(
      userId,
      saveDto.apiKey,
      saveDto.secretKey,
    );
    return result;
  }

  @Post('check-token')
  @HttpCode(HttpStatus.OK)
  @IgnoreLog({ ignoreBody: true })
  async checkToken(@Request() req: any, @Body() body: { masterToken: string }) {
    if (!body.masterToken) {
      return { ok: false };
    }
    const permissions = await this.binanceCredentialsService.checkMasterToken(
      req.user.id,
      body.masterToken,
    );
    return { ok: true, permissions };
  }

  @Get('listen-key')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async getListenKey(@Request() req: any, @MasterToken() masterToken: string) {
    const listenKey = await this.binanceCredentialsService.getListenKey(
      req.user.id,
      masterToken,
    );
    return { listenKey };
  }

  @Get('futures/account-info')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async getFuturesAccountInfo(
    @Request() req: any,
    @MasterToken() masterToken: string,
  ) {
    return this.binanceCredentialsService.getFuturesAccountInfo(
      req.user.id,
      masterToken,
    );
  }

  @Get('futures/balance')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async getFuturesBalance(
    @Request() req: any,
    @MasterToken() masterToken: string,
  ) {
    const balance = await this.binanceCredentialsService.getFuturesBalance(
      req.user.id,
      masterToken,
    );
    return { ok: true, balance };
  }

  @Post('place-position')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async placePosition(
    @Request() req: any,
    @MasterToken() masterToken: string,
    @Body() body: any,
  ) {
    if (!body.symbol) {
      return { ok: false, message: 'Missing parameters' };
    }
    return this.binanceCredentialsService.placeFuturesPosition(
      req.user.id,
      body,
      masterToken,
    );
  }
}
