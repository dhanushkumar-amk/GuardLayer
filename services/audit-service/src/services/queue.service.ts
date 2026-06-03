import { redisSubscriber } from '../db/redis';
import { LoggerService } from './logger.service';

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

    redisSubscriber.on('message', async (channel, message) => {
      try {
        const payload = JSON.parse(message);
        if (channel === 'guardlayer:audit') {
          await this.processWithRetry(() => loggerService.writeAuditLog(payload), 'audit');
        } else if (channel === 'guardlayer:threats') {
          await this.processWithRetry(() => loggerService.writeThreatLog(payload), 'threat');
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
export { QueueService };
