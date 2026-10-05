import { IsString, IsOptional, IsNumber, IsIn, IsBoolean } from "class-validator";

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

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsBoolean()
  showFloatingClock?: boolean;
}

export class UserSettingsResDto {
  theme!: string;
  language!: string;
  timeFrame!: string;
  suggestionLimit!: number;
  timeZone!: string;
  showFloatingClock!: boolean;
}
