import { Injectable, BadRequestException } from '@nestjs/common';
import { EncryptionService } from '../encryption/encryption.service';
import { BinanceCredentialRepository } from './binance-credential.repository';
import { generateBinanceSignature } from './binance-signature.util';

export interface BinancePermissions {
  readAccount: boolean;
  tradeSpot: boolean;
  tradeFutures: boolean;
}

@Injectable()
export class BinanceCredentialsService {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly credentialRepository: BinanceCredentialRepository,
  ) {}

  async checkCredentials(apiKey: string, secretKey: string): Promise<BinancePermissions> {
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

      const data = await response.json();
      
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

  async saveCredentials(userId: string, apiKey: string, secretKey: string): Promise<{ token: string }> {
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

  async checkMasterToken(userId: string, masterToken: string): Promise<BinancePermissions> {
    const credential = await this.credentialRepository.findByUserId(userId);
    if (!credential) {
      throw new BadRequestException('No Binance credentials found for this user.');
    }

    try {
      const apiKey = this.encryptionService.decrypt(
        credential.encryptedApiKey,
        credential.apiKeyIv,
        credential.apiKeyAuthTag,
        masterToken
      );

      const secretKey = this.encryptionService.decrypt(
        credential.encryptedSecretKey,
        credential.secretKeyIv,
        credential.secretKeyAuthTag,
        masterToken
      );

      return await this.checkCredentials(apiKey, secretKey);
    } catch (error) {
      throw new BadRequestException('Invalid Master Token or Binance API error');
    }
  }
}
