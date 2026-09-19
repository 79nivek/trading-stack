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

  @IsString()
  @IsOptional()
  JWT_SECRET = process.env['JWT_SECRET'] || 'default-secret';

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
  OLLAMA_HOST = process.env['OLLAMA_HOST'] || '';

  @IsString()
  @IsOptional()
  OLLAMA_MODEL = process.env['OLLAMA_MODEL'] || '';

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
