import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MarkedPricesService } from './marked-prices.service';
import { CreateMarkedPriceDto, MarkedPriceResDto } from '@trading-stack/shared-dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { GetUser } from '../../decorators/user.decorator';
import { User } from '../users/user.entity';

@Controller('marked-prices')
@UseGuards(JwtAuthGuard)
export class MarkedPricesController {
  constructor(private readonly markedPricesService: MarkedPricesService) {}

  @Post()
  async create(
    @GetUser() user: User,
    @Body() dto: CreateMarkedPriceDto,
  ): Promise<MarkedPriceResDto> {
    const item = await this.markedPricesService.create(user.id, dto);
    return {
      id: item.id,
      symbol: item.symbol,
      price: Number(item.price), // ensure it's a number after coming from DB decimal
      createdAt: item.createdAt,
    };
  }

  @Get(':symbol')
  async getBySymbol(
    @GetUser() user: User,
    @Param('symbol') symbol: string,
  ): Promise<MarkedPriceResDto[]> {
    const items = await this.markedPricesService.findBySymbol(user.id, symbol);
    return items.map((item) => ({
      id: item.id,
      symbol: item.symbol,
      price: Number(item.price),
      createdAt: item.createdAt,
    }));
  }

  @Delete(':id')
  async delete(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.markedPricesService.delete(user.id, id);
    return { success: true };
  }
}
