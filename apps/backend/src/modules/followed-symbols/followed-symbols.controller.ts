import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { FollowedSymbolsService } from './followed-symbols.service';
import {
  CreateFollowedSymbolDto,
  FollowedSymbolDto,
  TokenSuggestionDto,
} from '@trading-stack/shared-dto';

@Controller('followed-symbols')
@UseGuards(JwtAuthGuard)
export class FollowedSymbolsController {
  constructor(
    private readonly followedSymbolsService: FollowedSymbolsService,
  ) {}

  /** List all followed symbols for the authenticated user */
  @Get()
  getAll(@Request() req: any): Promise<FollowedSymbolDto[]> {
    return this.followedSymbolsService.getAll(req.user.id);
  }

  /**
   * Fetch live Binance data (TokenSuggestionDto) for all followed symbols.
   * Must be declared before :id route to avoid route collision.
   */
  @Get('data')
  getSymbolsData(@Request() req: any): Promise<TokenSuggestionDto[]> {
    return this.followedSymbolsService.getSymbolsData(req.user.id);
  }

  /** Add a new followed symbol */
  @Post()
  add(
    @Request() req: any,
    @Body() body: CreateFollowedSymbolDto,
  ): Promise<FollowedSymbolDto> {
    return this.followedSymbolsService.add(req.user.id, body);
  }

  /** Remove a followed symbol (soft-delete) */
  @Delete(':id')
  remove(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    return this.followedSymbolsService.remove(id, req.user.id);
  }

  /**
   * Persist manual drag-and-drop order.
   * Body: { orderedIds: string[] } — full ordered list of followed-symbol IDs.
   */
  @Patch('reorder')
  reorder(
    @Request() req: any,
    @Body() body: { orderedIds: string[] },
  ): Promise<void> {
    return this.followedSymbolsService.reorder(req.user.id, body.orderedIds);
  }
}
