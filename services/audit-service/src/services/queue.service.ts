import { redisSubscriber } from '../db/redis';
import { LoggerService } from './logger.service';
import { sseClients } from '../controllers/threats.controller';

const loggerService = new LoggerService();

export class QueueService {
  /**
   * Subscribes to Redis channels and processes incoming log messages.
   */
  async start(): Promise<void> {
    try {
      await redisSubscriber.subscribe('guardlayer:audit', 'guardlayer:threats');
      console.log('[Queue Service] Subscribed to guardlayer:audit & guardlayer:threats');
    } catch (err: any) {
      console.error('[Queue Service] Failed to subscribe to Redis channels:', err.message);
    }

    redisSubscriber.on('message', async (channel: string, message: string) => {
      try {
        const payload = JSON.parse(message);
        if (channel === 'guardlayer:audit') {
          await this.processWithRetry(() => loggerService.writeAuditLog(payload), 'audit');
        } else if (channel === 'guardlayer:threats') {
          await this.processWithRetry(() => loggerService.writeThreatLog(payload), 'threat');
          
          // Broadcast to connected SSE clients
          if (sseClients && sseClients.length > 0) {
            const formattedThreat = {
              id: payload.id || payload.threat_id || payload.request_id || Math.random().toString(36).substring(7),
              api_key_id: payload.api_key_id,
              request_id: payload.request_id,
              threat_type: payload.threat_type,
              threat_score: Number(payload.threat_score || 0.0),
              original_input: payload.original_input || '',
              detected_at: payload.detected_at || new Date().toISOString(),
              guard_name: payload.guard_name || ''
            };
            sseClients.forEach((client) => {
              try {
                client.write(`data: ${JSON.stringify(formattedThreat)}\n\n`);
              } catch (clientErr) {
                // Ignore client write errors
              }
            });
          }
        }
      } catch (err: any) {
        console.error(`[Queue Service] Malformed event on ${channel}:`, err.message || err);
      }
    });
  }

  /**
   * Executes a database operation with exponential backoff retries.
   */
  private async processWithRetry(
    operation: () => Promise<void>,
    type: string,
    retriesLeft = 3,
    delay = 100
  ): Promise<void> {
    try {
      await operation();
    } catch (err: any) {
      if (retriesLeft > 0) {
        console.warn(`[Queue Service] Failed ${type} write, retrying in ${delay}ms... (${retriesLeft} left). Error: ${err.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        await this.processWithRetry(operation, type, retriesLeft - 1, delay * 2);
      } else {
        console.error(`[Queue Service] Error writing ${type} log after all retries:`, err.message);
      }
    }
  }

  /**
   * Stops the queue listener by unsubscribing.
   */
  async stop(): Promise<void> {
    try {
      await redisSubscriber.unsubscribe('guardlayer:audit', 'guardlayer:threats');
    } catch (err: any) {
      console.error('[Queue Service] Error unsubscribing:', err.message);
    }
  }
}
