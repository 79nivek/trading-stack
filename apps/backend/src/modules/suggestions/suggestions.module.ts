import { Module } from '@nestjs/common';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';
import { LlmService } from './llm.service';

@Module({
  controllers: [SuggestionsController],
  providers: [SuggestionsService, LlmService],
})
export class SuggestionsModule {}
