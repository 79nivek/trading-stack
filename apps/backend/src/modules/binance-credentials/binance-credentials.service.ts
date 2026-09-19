import { DerivativesTradingUsdsFutures } from '@binance/derivatives-trading-usds-futures';
import { Injectable, BadRequestException } from '@nestjs/common';
import { EncryptionService } from '../encryption/encryption.service';
import { BinanceCredentialRepository } from './binance-credential.repository';
import { generateBinanceSignature } from './binance-signature.util';
import { directionToOppositeSide } from '../../utils';
import { Direction } from '@trading-stack/shared-dto';

export interface BinancePermissions {
  readAccount: boolean;
  tradeSpot: boolean;
  tradeFutures: boolean;
}

@Injectable()
export class BinanceCredentialsService {
  private exchangeInfoCache: any = null;
  private exchangeInfoCacheTime = 0;

  private async getSymbolPrecision(symbol: string) {
    if (
      !this.exchangeInfoCache ||
      Date.now() - this.exchangeInfoCacheTime > 3600000
    ) {
      try {
        const response = await fetch(
          'https://fapi.binance.com/fapi/v1/exchangeInfo',
        );
        if (response.ok) {
          this.exchangeInfoCache = await response.json();
          this.exchangeInfoCacheTime = Date.now();
        }
      } catch (e) {
        console.error('Failed to fetch exchange info', e);
      }
    }

    if (this.exchangeInfoCache && this.exchangeInfoCache.symbols) {
      const symInfo = this.exchangeInfoCache.symbols.find(
        (s: any) => s.symbol === symbol,
      );
      if (symInfo) {
        return {
          quantityPrecision: symInfo.quantityPrecision ?? 3,
          pricePrecision: symInfo.pricePrecision ?? 4,
        };
      }
    }
    return { quantityPrecision: 3, pricePrecision: 4 }; // Fallback
  }

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly credentialRepository: BinanceCredentialRepository,
  ) {}

  private async getSecret(userId: string, masterToken: string) {
    const credential = await this.credentialRepository.findByUserId(userId);
    if (!credential) {
      throw new BadRequestException(
        'No Binance credentials found for this user.',
      );
    }

    try {
      const apiKey = this.encryptionService.decrypt(
        credential.encryptedApiKey,
        credential.apiKeyIv,
        credential.apiKeyAuthTag,
        masterToken,
      );

      const secretKey = this.encryptionService.decrypt(
        credential.encryptedSecretKey,
        credential.secretKeyIv,
        credential.secretKeyAuthTag,
        masterToken,
      );
      return { apiKey, secretKey };
    } catch (error) {
      throw new BadRequestException(
        'Invalid Master Token or Binance API error',
      );
    }
  }

  async checkCredentials(
    apiKey: string,
    secretKey: string,
  ): Promise<BinancePermissions> {
    const timestamp = Date.now();
    // For checking API key permissions, Binance provides /sapi/v1/account/apiRestrictions
    const queryString = `timestamp=${timestamp}`;

    const signature = generateBinanceSignature(queryString, secretKey);
    const encodedSignature = encodeURIComponent(signature);

    const url = `https://api.binance.com/sapi/v1/account/apiRestrictions?${queryString}&signature=${encodedSignature}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      });

      if (!response.ok) {
        // Fallback or just throw error if credentials are bad
        throw new BadRequestException('Invalid Binance credentials');
      }

      const data: any = await response.json();

      // Expected payload contains:
      // enableReading, enableSpotAndMarginTrading, enableFutures
      return {
        readAccount: !!data.enableReading,
        tradeSpot: !!data.enableSpotAndMarginTrading,
        tradeFutures: !!data.enableFutures,
      };
    } catch (error) {
      throw new BadRequestException('Invalid Binance credentials');
    }
  }

  async saveCredentials(
    userId: string,
    apiKey: string,
    secretKey: string,
  ): Promise<{ token: string }> {
    const token = this.encryptionService.generateMasterToken();

    const encryptedApiKey = this.encryptionService.encrypt(apiKey, token);
    const encryptedSecretKey = this.encryptionService.encrypt(secretKey, token);

    let credential = await this.credentialRepository.findByUserId(userId);

    if (!credential) {
      credential = this.credentialRepository.create({ userId });
    }

    credential.encryptedApiKey = encryptedApiKey.encryptedText;
    credential.apiKeyIv = encryptedApiKey.iv;
    credential.apiKeyAuthTag = encryptedApiKey.authTag;

    credential.encryptedSecretKey = encryptedSecretKey.encryptedText;
    credential.secretKeyIv = encryptedSecretKey.iv;
    credential.secretKeyAuthTag = encryptedSecretKey.authTag;

    await this.credentialRepository.save(credential);

    return { token };
  }

  async checkMasterToken(
    userId: string,
    masterToken: string,
  ): Promise<BinancePermissions> {
    const credential = await this.credentialRepository.findByUserId(userId);
    if (!credential) {
      throw new BadRequestException(
        'No Binance credentials found for this user.',
      );
    }

    try {
      const apiKey = this.encryptionService.decrypt(
        credential.encryptedApiKey,
        credential.apiKeyIv,
        credential.apiKeyAuthTag,
        masterToken,
      );

      const secretKey = this.encryptionService.decrypt(
        credential.encryptedSecretKey,
        credential.secretKeyIv,
        credential.secretKeyAuthTag,
        masterToken,
      );

      return await this.checkCredentials(apiKey, secretKey);
    } catch (error) {
      throw new BadRequestException(
        'Invalid Master Token or Binance API error',
      );
    }
  }

  async getFuturesBalance(
    userId: string,
    masterToken: string,
  ): Promise<number> {
    try {
      const { apiKey, secretKey } = await this.getSecret(userId, masterToken);

      const client = new DerivativesTradingUsdsFutures({
        configurationRestAPI: {
          apiKey: apiKey,
          privateKey: secretKey,
        },
      });

      const data = await client.restAPI.accountInformationV3().then((res) => {
        return res.data();
      });

      return data.availableBalance ? parseFloat(data.availableBalance) : 0;
    } catch (error) {
      console.error('Error in getFuturesBalance:', error);
      throw new BadRequestException(
        'Failed to get futures balance or invalid master token.',
      );
    }
  }

  async placeFuturesPosition(
    userId: string,
    setup: any,
    masterToken: string,
  ): Promise<any> {
    try {
      const { apiKey, secretKey } = await this.getSecret(userId, masterToken);

      // Dynamically fetch precision for the specific symbol
      // Dynamically fetch precision for the specific symbol
      const { quantityPrecision, pricePrecision } =
        await this.getSymbolPrecision(setup.symbol);

      const qty = parseFloat(setup.volume.toFixed(quantityPrecision));
      const tpPrice = parseFloat(setup.takeProfitPrice.toFixed(pricePrecision));
      const slPrice = parseFloat(setup.stopLossPrice.toFixed(pricePrecision));

      const client = new DerivativesTradingUsdsFutures({
        configurationRestAPI: {
          apiKey: apiKey,
          privateKey: secretKey,
        },
      });

      await this.setLeverage(
        { symbol: setup.symbol, leverage: setup.leverage },
        client,
      );

      // 2. Place Main Market Order
      const mainOrder = await this.placeMainOrder(
        { direction: setup.direction, symbol: setup.symbol, quantity: qty },
        client,
      );

      // 3. Place TP Order (using Algo endpoint as requested by Binance)
      const tpOrder = await this.placeTP(
        { direction: setup.direction, symbol: setup.symbol, price: tpPrice },
        client,
      );

      // 4. Place SL Order
      const slOrder = await this.placeSL(
        { direction: setup.direction, symbol: setup.symbol, price: slPrice },
        client,
      );

      return { success: true, mainOrder, tpOrder, slOrder };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to place position',
      );
    }
  }

  async placeSL(
    setup: { direction: Direction; symbol: string; price: number },
    client: any,
  ) {
    const oppositeSide = directionToOppositeSide(setup.direction);
    const res = await client.restAPI.newAlgoOrder({
      symbol: setup.symbol,
      side: oppositeSide as any,
      type: 'STOP_MARKET' as any,
      algoType: 'CONDITIONAL' as any,
      triggerPrice: setup.price,
      closePosition: 'true' as any,
    });

    return res.data();
  }

  async placeTP(
    setup: { direction: Direction; symbol: string; price: number },
    client: any,
  ) {
    const oppositeSide = directionToOppositeSide(setup.direction);
    const res = await client.restAPI.newAlgoOrder({
      symbol: setup.symbol,
      side: oppositeSide as any,
      type: 'TAKE_PROFIT_MARKET' as any,
      algoType: 'CONDITIONAL' as any,
      triggerPrice: setup.price,
      closePosition: 'true' as any,
    });

    return res.data;
  }

  async placeMainOrder(
    setup: { direction: Direction; symbol: string; quantity: number },
    client: any,
  ) {
    const side = setup.direction === Direction.LONG ? 'BUY' : 'SELL';
    const mainOrderResponse = await client.restAPI.newOrder({
      symbol: setup.symbol,
      side: side as any,
      type: 'MARKET' as any,
      quantity: setup.quantity,
    });
    return mainOrderResponse.data;
  }

  async setLeverage(params: { symbol: string; leverage: number }, client: any) {
    const res = await client.restAPI.changeInitialLeverage({
      symbol: params.symbol,
      leverage: params.leverage,
    });
    return res.data;
  }
}
