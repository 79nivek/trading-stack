import { Injectable, NotFoundException } from '@nestjs/common';
import { MarkedPriceRepository } from './marked-price.repository';
import { MarkedPrice } from './marked-price.entity';
import { CreateMarkedPriceDto } from '@trading-stack/shared-dto';

@Injectable()
export class MarkedPricesService {
  constructor(private readonly repository: MarkedPriceRepository) {}

  async create(userId: string, dto: CreateMarkedPriceDto): Promise<MarkedPrice> {
    const markedPrice = this.repository.create({
      userId,
      symbol: dto.symbol,
      price: Number(dto.price),
      title: dto.title,
    });
    return this.repository.save(markedPrice);
  }

  async findBySymbol(userId: string, symbol: string): Promise<MarkedPrice[]> {
    return this.repository.findBySymbol(userId, symbol);
  }

  async delete(userId: string, id: string): Promise<void> {
    const item = await this.repository.findOneByIdAndUserId(userId, id);
    if (!item) {
      throw new NotFoundException('Marked price not found');
    }
    await this.repository.softRemove(item);
  }
}
