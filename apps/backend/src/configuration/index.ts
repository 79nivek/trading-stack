import { Logger } from '@nestjs/common';
import {
  IsString,
  validateSync,
  IsBoolean,
  IsOptional,
  IsNumber,
} from 'class-validator';

class Configuration {
  @IsString()
  @IsOptional()
  NODE_ENV = process.env['NODE_ENV'] || 'development';

  @IsBoolean()
  @IsOptional()
  IS_DEV = process.env['IS_DEV'] || true;

  // Binance API credentials — Ed25519 (for User Data Stream via WebSocket API v3)
  @IsString()
  @IsOptional()
  BINANCE_API_KEY = process.env['BINANCE_API_KEY'] || '';

  @IsString()
  @IsOptional()
  BINANCE_PRIVATE_KEY = (process.env['BINANCE_PRIVATE_KEY'] || '').replace(
    /\\n/g,
    '\n',
  );

  @IsString()
  @IsOptional()
  DISCORD_TOKEN = process.env['DISCORD_TOKEN'] || '';

  // Postgres Configuration
  @IsString()
  @IsOptional()
  POSTGRES_HOST = process.env['POSTGRES_HOST'] || 'localhost';

  @IsString()
  @IsOptional()
  POSTGRES_PORT = process.env['POSTGRES_PORT'] || '5432';

  @IsString()
  @IsOptional()
  POSTGRES_USER = process.env['POSTGRES_USER'] || 'postgres';

  @IsString()
  @IsOptional()
  POSTGRES_PASSWORD = process.env['POSTGRES_PASSWORD'] || 'postgres';

  @IsString()
  @IsOptional()
  POSTGRES_DB = process.env['POSTGRES_DB'] || 'binance_bot';

  @IsString()
  @IsOptional()
  DISCORD_WEBHOOK_SPOT = process.env['DISCORD_WEBHOOK_SPOT'] || '';

  @IsString()
  @IsOptional()
  DISCORD_WEBHOOK_FUTURES = process.env['DISCORD_WEBHOOK_FUTURES'] || '';

  @IsString()
  @IsOptional()
  DISCORD_WEBHOOK_FUTURES_EVENT =
    process.env['DISCORD_WEBHOOK_FUTURES_EVENT'] || '';

  @IsNumber()
  @IsOptional()
  MAX_OPEN_POSITIONS = Number(process.env['MAX_OPEN_POSITIONS'] || 3);

  @IsNumber()
  @IsOptional()
  QUICK_TAKE_PROFIT_USDT = Number(process.env['QUICK_TAKE_PROFIT_USDT'] || 10);

  @IsNumber()
  @IsOptional()
  ULTIMATE_INSURANCE_BALANCE_USDT = Number(
    process.env['ULTIMATE_INSURANCE_BALANCE_USDT'] || 1950,
  );

  @IsNumber()
  @IsOptional()
  TOKEN_COOLDOWN_MINUTES = Number(process.env['TOKEN_COOLDOWN_MINUTES'] || 15);

  validate(): void {
    const errors = validateSync(this);
    if (errors.length > 0) {
      Logger.error(errors);
      throw new Error('Configuration is invalid');
    }
  }
}

export const CONFIGURATION = new Configuration();

console.log('env: ', CONFIGURATION);
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();
