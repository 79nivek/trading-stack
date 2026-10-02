import {
  IsString,
  MaxLength,
  IsNumber,
  Max,
  IsNotEmpty,
  Min,
  IsOptional,
} from 'class-validator';

export class ForecastParamsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  symbol!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  timeFrame?: string;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class ForecastDto {
  @IsNumber()
  @IsNotEmpty()
  openTime!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  trend!: string;

  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @IsNumber()
  @IsNotEmpty()
  min_price!: number;

  @IsNumber()
  @IsNotEmpty()
  max_price!: number;

  @IsNumber()
  @IsNotEmpty()
  @Max(1)
  @Min(0)
  confidence!: number;
}
