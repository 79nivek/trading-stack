import { IsString, IsOptional } from 'class-validator';

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
}

export class UserSettingsDto {
  theme!: string;
  language!: string;
  timeFrame!: string;
}
