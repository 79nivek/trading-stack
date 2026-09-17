import { Controller, Get, Query } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';

@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Get('futures')
  async getFuturesSuggestions(@Query('limit') limit: number = 10) {
    return this.suggestionsService.getFuturesSuggestions(Number(limit));
  }
}
