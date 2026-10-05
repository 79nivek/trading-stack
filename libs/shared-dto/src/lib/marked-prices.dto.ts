import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMarkedPriceDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsString()
  @IsNotEmpty()
  price!: string;

  @IsString()
  @IsOptional()
  title?: string;
}

export class MarkedPriceResDto {
  id!: string;
  symbol!: string;
  price!: number;
  title?: string;
  createdAt!: Date;
}
