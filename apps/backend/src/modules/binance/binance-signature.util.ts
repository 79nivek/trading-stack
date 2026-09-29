import * as crypto from 'crypto';

export enum KeyType {
  HMAC_SHA256 = 'HMAC_SHA256',
  ASYMMETRIC = 'ASYMMETRIC',
}

/**
 * Determines the type of the private key based on its format.
 * Asymmetric keys (like Ed25519 or RSA) typically come in PEM format.
 */
export function determineKeyType(secretKey: string): KeyType {
  const trimmedKey = secretKey.trim();
  if (trimmedKey.startsWith('-----BEGIN PRIVATE KEY-----') || trimmedKey.startsWith('-----BEGIN RSA PRIVATE KEY-----')) {
    return KeyType.ASYMMETRIC;
  }
  return KeyType.HMAC_SHA256;
}

/**
 * Generates the appropriate signature for Binance API based on the key type.
 */
export function generateBinanceSignature(queryString: string, secretKey: string): string {
  const keyType = determineKeyType(secretKey);

  if (keyType === KeyType.ASYMMETRIC) {
    // For Ed25519 or RSA, Binance requires a base64 encoded signature
    const isEd25519 = secretKey.includes('MC4CAQAwBQYDK2Vw'); // ASN.1 prefix for Ed25519
    const algorithm = isEd25519 ? null : 'sha256';
    const signature = crypto.sign(algorithm, Buffer.from(queryString), secretKey);
    return signature.toString('base64');
  } else {
    // For HMAC-SHA256, Binance requires a hex encoded signature
    return crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
  }
}
