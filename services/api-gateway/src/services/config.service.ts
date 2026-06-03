import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'guardlayer-default-jwt-secret-key';
const CONFIG_SERVICE_URL = process.env.CONFIG_SERVICE_URL || 'http://config-service:3001';

export class ConfigServiceClient {
  static async fetchConfig(apiKeyId: string): Promise<any> {
    // Generate service-to-service JWT token signed with JWT_SECRET
    const token = jwt.sign({ service: 'api-gateway', admin: true }, JWT_SECRET, { expiresIn: '1m' });

    try {
      const response = await fetch(`${CONFIG_SERVICE_URL}/api/config/${apiKeyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Config not found for API key');
        }
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error calling config-service:', error.message);
      throw error;
    }
  }
}
