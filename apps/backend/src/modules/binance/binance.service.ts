import { DerivativesTradingUsdsFutures } from '@binance/derivatives-trading-usds-futures';
import { Injectable, BadRequestException } from '@nestjs/common';
import { EncryptionService } from '../encryption/encryption.service';
import { BinanceCredentialRepository } from './binance-credential.repository';
import { generateBinanceSignature } from './binance-signature.util';
import { directionToOppositeSide } from '../../utils';
import {
  AccountInfoResponse,
  Direction,
  Order,
  OrderType,
  Position,
  SetOrderReq,
} from '@trading-stack/shared-dto';
import { MarketDataService } from '../market-data/market-data.service';
import { TradingFormatter } from '@trading-stack/shared';

export interface BinancePermissions {
  readAccount: boolean;
  tradeSpot: boolean;
  tradeFutures: boolean;
}

@Injectable()
export class BinanceService {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly credentialRepository: BinanceCredentialRepository,
    private readonly marketDataServ: MarketDataService,
  ) {}

  private async getSymbolPrecision(symbol: string) {
    const exchangeOption = await this.marketDataServ.getExchangeOption(symbol);
    if (!exchangeOption) {
      throw new BadRequestException(`Symbol ${symbol} not found`);
    }

    return exchangeOption; // Fallback
  }

  async getSecret(userId: string, masterToken: string) {
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

  async getListenKey(userId: string, masterToken: string): Promise<string> {
    const { apiKey } = await this.getSecret(userId, masterToken);
    try {
      const response = await fetch(
        'https://fapi.binance.com/fapi/v1/listenKey',
        {
          method: 'POST',
          headers: {
            'X-MBX-APIKEY': apiKey,
          },
        },
      );
      if (!response.ok) {
        throw new Error('Failed to create listen key');
      }
      const data: any = await response.json();
      return data.listenKey;
    } catch (error: any) {
      throw new BadRequestException('Failed to get listen key');
    }
  }

  async getFuturesAccountInfo(
    userId: string,
    masterToken: string,
  ): Promise<AccountInfoResponse> {
    try {
      const { apiKey, secretKey } = await this.getSecret(userId, masterToken);
      const client = new DerivativesTradingUsdsFutures({
        configurationRestAPI: {
          apiKey: apiKey,
          privateKey: secretKey,
        },
      });

      const accountData = await client.restAPI
        .accountInformationV3()
        .then((res) => res.data());

      const futureBalance = parseFloat(accountData.totalWalletBalance || '0');
      const unrealizedPnl = parseFloat(
        accountData.totalUnrealizedProfit || '0',
      );

      const now = new Date();
      const startTime = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      );

      const incomeData = await client.restAPI
        .getIncomeHistory({
          incomeType: 'REALIZED_PNL' as any,
          startTime,
          limit: 1000,
        })
        .then((res) => res.data());

      const realizedPnlToday = (incomeData || []).reduce(
        (sum: number, item: any) => sum + parseFloat(item.income || '0'),
        0,
      );

      return {
        futureBalance,
        unrealizedPnl,
        realizedPnlToday,
      };
    } catch (error) {
      console.error('Error in getFuturesAccountInfo:', error);
      throw new BadRequestException('Failed to get futures account info');
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
      const formatter = await this.getSymbolPrecision(setup.symbol);

      const qty = TradingFormatter.formatQuantity(setup.volume, formatter);
      const tpPrice = TradingFormatter.formatPrice(
        setup.takeProfitPrice,
        formatter,
      );
      const slPrice = TradingFormatter.formatPrice(
        setup.stopLossPrice,
        formatter,
      );

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
      const tpOrder = await this.placeTP({
        direction: setup.direction,
        symbol: setup.symbol,
        price: tpPrice.toString(),
        quantity: qty.toString(),
        $client: client,
      });

      // 4. Place SL Order
      const slOrder = await this.placeSL({
        direction: setup.direction,
        symbol: setup.symbol,
        price: slPrice.toString(),
        quantity: qty.toString(),
        $client: client,
      });

      return { success: true, mainOrder, tpOrder, slOrder };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to place position',
      );
    }
  }

  async placeSL(
    setup: SetOrderReq & {
      masterToken?: string;
      userId?: string;
      $client?: DerivativesTradingUsdsFutures;
    },
  ) {
    let client!: DerivativesTradingUsdsFutures;

    try {
      if (setup.$client) {
        client = setup.$client;
      } else {
        if (!setup.userId || !setup.masterToken) {
          throw new BadRequestException('Missing parameters');
        }

        const { apiKey, secretKey } = await this.getSecret(
          setup.userId,
          setup.masterToken,
        );

        client = new DerivativesTradingUsdsFutures({
          configurationRestAPI: {
            apiKey: apiKey,
            privateKey: secretKey,
          },
        });
      }

      const oppositeSide = directionToOppositeSide(setup.direction);

      const formatOption = await this.getSymbolPrecision(setup.symbol);

      const qty = TradingFormatter.formatQuantity(
        +setup.quantity,
        formatOption,
      );
      const price = TradingFormatter.formatPrice(+setup.price, formatOption);

      const params = {
        symbol: setup.symbol,
        side: oppositeSide as any,
        type: OrderType.STOP_MARKET as any,
        algoType: 'CONDITIONAL' as any,
        triggerPrice: price,
        closePosition: 'false' as any,
        quantity: Math.abs(qty),
        // selfTradePreventionMode: 'NONE' as any,
        timeInForce: 'GTC' as any,
        priceProtect: 'true' as any,
        reduceOnly: 'true' as any,
      };

      const res = await client.restAPI.newAlgoOrder(params);

      return res.data() as Order;
    } catch (error: any) {
      throw new BadRequestException(error);
    }
  }

  async placeTP(
    setup: SetOrderReq & {
      masterToken?: string;
      userId?: string;
      $client?: DerivativesTradingUsdsFutures;
    },
  ) {
    let client!: DerivativesTradingUsdsFutures;

    try {
      if (setup.$client) {
        client = setup.$client;
      } else {
        if (!setup.userId || !setup.masterToken) {
          throw new BadRequestException('Missing parameters');
        }

        const { apiKey, secretKey } = await this.getSecret(
          setup.userId,
          setup.masterToken,
        );

        client = new DerivativesTradingUsdsFutures({
          configurationRestAPI: {
            apiKey: apiKey,
            privateKey: secretKey,
          },
        });
      }

      const oppositeSide = directionToOppositeSide(setup.direction);

      const formatOption = await this.getSymbolPrecision(setup.symbol);

      const qty = TradingFormatter.formatQuantity(
        +setup.quantity,
        formatOption,
      );
      const price = TradingFormatter.formatPrice(+setup.price, formatOption);

      const res = await client.restAPI.newAlgoOrder({
        symbol: setup.symbol,
        side: oppositeSide as any,
        type: OrderType.TAKE_PROFIT_MARKET as any,
        algoType: 'CONDITIONAL' as any,
        triggerPrice: price,
        closePosition: 'false' as any,
        quantity: Math.abs(qty),
        // selfTradePreventionMode: 'NONE' as any,
        timeInForce: 'GTC' as any,
        priceProtect: 'true' as any,
        reduceOnly: 'true' as any,
      });

      return res.data() as Order;
    } catch (error: any) {
      throw new BadRequestException(error);
    }
  }

  async cancelOrder(
    orderId: string,
    credentials: { userId: string; masterToken: string; symbol: string },
  ) {
    try {
      const { apiKey, secretKey } = await this.getSecret(
        credentials.userId,
        credentials.masterToken,
      );
      const client = new DerivativesTradingUsdsFutures({
        configurationRestAPI: {
          apiKey: apiKey,
          privateKey: secretKey,
        },
      });

      const res = await client.restAPI.cancelAlgoOrder({
        algoId: +orderId,
      });

      return res.data() as any;
    } catch (error: any) {
      throw new BadRequestException(error);
    }
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

  async closePosition(userId: string, masterToken: string, symbol: string) {
    try {
      const { apiKey, secretKey } = await this.getSecret(userId, masterToken);

      const client = new DerivativesTradingUsdsFutures({
        configurationRestAPI: {
          apiKey: apiKey,
          privateKey: secretKey,
        },
      });

      // Execute a MARKET order with closePosition=true for both sides to cover Hedge Mode and One-way Mode.
      // Or we can fetch the position side first. Let's fetch position side first.
      const posData = await client.restAPI
        .positionInformationV2({ symbol })
        .then((res: any) => res.data());

      const openPositions = (posData as any[]).filter(
        (p) => parseFloat(p.positionAmt) !== 0,
      );

      if (openPositions.length === 0) {
        throw new BadRequestException('No open position for this symbol');
      }

      const results = [];
      for (const pos of openPositions) {
        const amt = parseFloat(pos.positionAmt);
        const side = amt > 0 ? 'SELL' : 'BUY';

        // In Hedge mode, we need to specify positionSide ('LONG' or 'SHORT').
        // In One-way mode, positionSide is 'BOTH'.
        const positionSide = pos.positionSide;

        const orderRes = await client.restAPI.newOrder({
          symbol: symbol,
          side: side as any,
          type: 'MARKET' as any,
          quantity: Math.abs(amt),
          positionSide: positionSide as any,
          reduceOnly: 'true' as any,
        });
        results.push(orderRes.data);
      }

      return {
        success: true,
        message: 'Position closed successfully',
      };
    } catch (error: any) {
      console.error('Error closing position:', error);
      throw new BadRequestException(
        error.message || 'Failed to close position',
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

  async getPositions(userId: string, masterToken: string) {
    const { apiKey, secretKey } = await this.getSecret(userId, masterToken);
    const client = new DerivativesTradingUsdsFutures({
      configurationRestAPI: {
        apiKey: apiKey,
        privateKey: secretKey,
      },
    });

    const posData = await client.restAPI
      .positionInformationV3()
      .then((res) => res.data());

    return posData.map((pos: any) => new Position(pos));
  }

  async getOrders(userId: string, masterToken: string) {
    const { apiKey, secretKey } = await this.getSecret(userId, masterToken);
    const client = new DerivativesTradingUsdsFutures({
      configurationRestAPI: {
        apiKey: apiKey,
        privateKey: secretKey,
      },
    });

    const [openOrders, algoOrders] = await Promise.all([
      client.restAPI.currentAllOpenOrders().then((res) => res.data()),
      client.restAPI
        .currentAllAlgoOpenOrders({ algoType: 'CONDITIONAL' })
        .then((res) => res.data()),
    ]);

    return [...openOrders, ...algoOrders].map((order: any) => new Order(order));
  }
}
