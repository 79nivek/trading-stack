import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class KlinesRequestDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsString()
  @IsNotEmpty()
  interval!: string;

  @IsString()
  @IsNotEmpty()
  limit!: string;

  @IsString()
  @IsOptional()
  endTime?: string;
}
