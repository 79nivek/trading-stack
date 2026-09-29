import { MicrostructureExitService } from './position.service';
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { LlmService } from '../llm/llm.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { BinanceService } from '../binance/binance.service';
import {
  Direction,
  EntryType,
  SuggestionPositionResponseDto,
} from '@trading-stack/shared-dto';
import { MasterToken } from '../../decorators/master-token.decorator';
import { RequireMasterToken } from '../../decorators/require-master-token.decorator';
import { UserSettingsService } from '../user-settings/user-settings.service';

@Controller('suggestions')
@UseGuards(JwtAuthGuard)
export class SuggestionsController {
  constructor(
    private readonly suggestionsService: SuggestionsService,
    private readonly llmService: LlmService,
    private readonly binanceService: BinanceService,
    private readonly microstructureExitService: MicrostructureExitService,
    private readonly userSettingService: UserSettingsService,
  ) {}

  @Get('futures')
  async getFuturesSuggestions(@Query('limit') limit: number | string = 10) {
    return this.suggestionsService.getFuturesSuggestions(Number(limit));
  }

  @Post('position')
  @RequireMasterToken()
  async suggestPosition(
    @Request() req: any,
    @MasterToken() masterToken: string,
    @Body() body: { symbol: string; balance?: number },
  ): Promise<SuggestionPositionResponseDto> {
    const { symbol, balance } = body;
    if (!symbol) {
      throw new BadRequestException('Symbol is required');
    }

    let balanceNum = balance ? Number(balance) : 0;

    // If no balance provided or balance is 0, fetch from Binance
    if (!balanceNum || balanceNum <= 0) {
      if (!masterToken) {
        throw new BadRequestException(
          'Master token is required to automatically fetch balance when input is 0 or empty',
        );
      }
      try {
        balanceNum = await this.binanceService.getFuturesBalance(
          req.user.id,
          masterToken,
        );
      } catch (e) {
        throw new BadRequestException(
          'Failed to fetch balance from Binance. Please check your master token or Binance credentials.',
        );
      }
      if (!balanceNum || balanceNum <= 0) {
        throw new BadRequestException(
          'Your Binance Futures balance is 0 or unavailable.',
        );
      }
    }

    const userSetting = await this.userSettingService.getSettings(req.user.id);

    // Call both concurrently
    const [llmSetup, quantSetups] = await Promise.all([
      this.llmService
        .llmPosition(symbol, balanceNum, userSetting.timeFrame)
        .catch((e) => {
          // Fallback for LLM failure
          return {
            strategyName: 'LLM Error',
            direction: Direction.NEUTRAL,
            leverage: 0,
            margin: 0,
            volume: 0,
            entryType: EntryType.MARKET,
            entryPrice: 0,
            takeProfitPrice: 0,
            stopLossPrice: 0,
            estimatedProfit: 0,
            estimatedLoss: 0,
            reasoning: 'Failed to generate LLM setup',
          };
        }),
      this.suggestionsService.quantPosition(symbol, balanceNum),
    ]);

    return { llmSetup, quantSetups, balanceNum };
  }
}
