import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { AnalyzeService } from './analyze.service';
import { FindOneSymbolDto, LlmAnalyzeTokenResponseDto } from '@trading-stack/shared-dto';

@Controller('analyze')
@UseGuards(JwtAuthGuard)
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  /** List all followed symbols for the authenticated user */
  @Get('quantitative/:symbol')
  quantitative(@Param() params: FindOneSymbolDto) {
    return this.analyzeService.quantitative(params.symbol);
  }

  @Get('llm/:symbol')
  llm(@Param() params: FindOneSymbolDto, @Req() req: any): Promise<LlmAnalyzeTokenResponseDto> {
    return this.analyzeService.llm(params.symbol, req.user.id);
  }
}
