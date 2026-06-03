import crypto from 'crypto';

export function generateApiKey(): string {
  // Generates a random key in format: gl-xxxxxxxxxxxxxxxx (32 hex characters)
  const random = crypto.randomBytes(16).toString('hex');
  return `gl-${random}`;
}

export function getPrefix(key: string): string {
  // Extract key prefix (first 8 characters: e.g. "gl-abcde")
  return key.substring(0, 8);
}
