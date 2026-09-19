import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  timeFrame?: string;

  @IsOptional()
  @IsNumber()
  @IsIn([3, 5, 10])
  suggestionLimit?: number;
}

export class UserSettingsDto {
  theme!: string;
  language!: string;
  timeFrame!: string;
  suggestionLimit?: number;
}
