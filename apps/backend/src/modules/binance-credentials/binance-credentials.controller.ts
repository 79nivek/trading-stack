import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BinanceCredentialsService } from './binance-credentials.service';
import {
  CheckBinanceCredentialsDto,
  SaveBinanceCredentialsDto,
} from '@trading-stack/shared-dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { MasterToken } from '../../decorators/master-token.decorator';
import { RequireMasterToken } from '../../decorators/require-master-token.decorator';

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

  @Post('futures/balance')
  @HttpCode(HttpStatus.OK)
  @RequireMasterToken()
  async getFuturesBalance(
    @Request() req: any,
    @MasterToken() masterToken: string,
  ) {
    if (!masterToken) {
      return { ok: false, balance: 0 };
    }
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
    const result = await this.binanceCredentialsService.placeFuturesPosition(
      req.user.id,
      body,
      masterToken,
    );
    return { ok: true, result };
  }
}
