import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { FollowedTokenService } from './followed-token.service';
import axios from 'axios';

@Controller()
export class FollowedTokenController {
  constructor(private readonly followedTokenService: FollowedTokenService) {}

  @Get('followed-tokens')
  async getTokens() {
    return this.followedTokenService.getFollowedTokens();
  }

  @Post('followed-tokens')
  async addToken(@Body('symbol') symbol: string) {
    if (!symbol) throw new Error('Symbol is required');
    await this.followedTokenService.addToken(symbol);
    return { success: true };
  }

  @Delete('followed-tokens/:symbol')
  async removeToken(@Param('symbol') symbol: string) {
    await this.followedTokenService.removeToken(symbol);
    return { success: true };
  }

  @Get('symbols')
  async getSymbols() {
    try {
      const response = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo');
      const symbols = response.data.symbols
        .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT' && s.contractType === 'PERPETUAL')
        .map((s: any) => s.symbol);
      return symbols;
    } catch (err) {
      console.error('Error fetching symbols from Binance', err);
      return [];
    }
  }
}
