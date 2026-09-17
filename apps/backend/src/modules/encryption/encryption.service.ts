import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';

  generateMasterToken(): string {
    // Return 32 hex characters (16 bytes of entropy)
    return crypto.randomBytes(16).toString('hex');
  }

  encrypt(text: string, masterToken: string): { encryptedText: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    // aes-256-gcm requires a 32-byte key. We hash the 32-char masterToken to get exactly 32 bytes.
    const key = crypto.createHash('sha256').update(String(masterToken)).digest();
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encryptedText = cipher.update(text, 'utf8', 'hex');
    encryptedText += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedText,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedText: string, ivHex: string, authTagHex: string, masterToken: string): string {
    const key = crypto.createHash('sha256').update(String(masterToken)).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
