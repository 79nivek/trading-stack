import { IsNotEmpty, IsString } from 'class-validator';

export class CheckBinanceCredentialsDto {
  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsString()
  @IsNotEmpty()
  secretKey!: string;
}

export class SaveBinanceCredentialsDto {
  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsString()
  @IsNotEmpty()
  secretKey!: string;
}
