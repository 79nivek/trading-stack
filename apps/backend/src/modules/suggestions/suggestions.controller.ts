import { Controller, Get, Query } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { LlmService } from './llm.service';

@Controller('suggestions')
export class SuggestionsController {
  constructor(
    private readonly suggestionsService: SuggestionsService,
    private readonly llmService: LlmService
  ) {}

  @Get('futures')
  async getFuturesSuggestions(@Query('limit') limit: number | string = 10) {
    return this.suggestionsService.getFuturesSuggestions(Number(limit));
  }

  @Get('ai-check')
  async aiCheck(@Query('symbol') symbol: string, @Query('timeFrame') timeFrame: string) {
    if (!symbol) {
      throw new Error('Symbol is required');
    }
    return this.llmService.llmCheck(symbol, timeFrame);
  }
}
