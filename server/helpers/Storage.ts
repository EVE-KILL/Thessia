// src/helpers/Storage.ts
import Redis from "ioredis";
import { cliLogger } from "~/server/helpers/Logger";

export class RedisStorage {
  // Static instance property
  private static instance: RedisStorage;

  // Redis client instance
  public client: Redis;

  // Private properties for pub/sub functionality
  private subscribeClient: Redis | null = null;
  private channelCallbacks: Map<string, Array<(message: string, channel: string) => void>> =
    new Map();
  private isShuttingDown = false;

  // Private constructor to prevent direct instantiation
  public constructor() {
    this.client = new Redis({
      host: process.env.REDIS_URI ? process.env.REDIS_URI : "192.168.10.10",
      port: process.env.REDIS_PORT ? Number.parseInt(process.env.REDIS_PORT) : 6379,
      db: process.env.REDIS_DB ? Number.parseInt(process.env.REDIS_DB) : 0,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    // Add connection event handlers
    this.client.on('connect', () => {
      cliLogger.info('Redis main client connected');
    });
    
    this.client.on('error', (err) => {
      cliLogger.error(`Redis main client error: ${err.message}`);
    });

    this.client.on('close', () => {
      cliLogger.info('Redis main client connection closed');
    });

    // Setup graceful shutdown handlers
    this.setupGracefulShutdown();
  }

  /**
   * Setup graceful shutdown handlers to properly close Redis connections
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      cliLogger.info(`Received ${signal}, gracefully shutting down Redis connections...`);
      try {
        await this.disconnect();
        cliLogger.info('Redis connections closed successfully');
        process.exit(0);
      } catch (error) {
        cliLogger.error(`Error during Redis shutdown: ${error}`);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      cliLogger.error(`Uncaught Exception: ${error.message}`);
      await gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', async (reason) => {
      cliLogger.error(`Unhandled Rejection: ${reason}`);
      await gracefulShutdown('unhandledRejection');
    });
  }

  // Static method to get the singleton instance
  public static getInstance(): RedisStorage {
    if (!RedisStorage.instance) {
      cliLogger.info('Creating new Redis storage singleton instance');
      RedisStorage.instance = new RedisStorage();
    }
    return RedisStorage.instance;
  }

  // Getter for the Redis client
  public getClient(): Redis {
    return this.client;
  }

  // Redis operations
  async set(key: string, value: any, ttl = 0): Promise<void> {
    if (ttl === 0) {
      // Set the value without expiration
      await this.client.set(key, value);
      return;
    }

    // Set the value with an expiration time (in seconds)
    await this.client.set(key, value, "EX", ttl);
  }

  async get(key: string): Promise<any | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // Get Redis statistics
  async getRedisStats(): Promise<Record<string, any>> {
    try {
      const info = await this.client.info();
      const parsedInfo: Record<string, any> = {};

      // Parse the INFO command output which is formatted as string with sections
      const sections = info.split("#");

      sections.forEach((section) => {
        const lines = section.split("\r\n").filter(Boolean);
        if (lines.length > 0) {
          const sectionName = lines[0].toLowerCase().trim();
          parsedInfo[sectionName] = {};

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line?.includes(":")) {
              const [key, value] = line.split(":");
              // Convert numeric values to numbers
              const numValue = Number(value);
              parsedInfo[sectionName][key] = Number.isNaN(numValue) ? value : numValue;
            }
          }
        }
      });

      return parsedInfo;
    } catch (err) {
      cliLogger.error(`Failed to get Redis stats: ${err}`);
      return {};
    }
  }

  // Redis Pub/Sub operations
  /**
   * Publish a message to a Redis channel
   * @param channel The channel to publish to
   * @param message The message to publish (will be stringified)
   */
  async publish(channel: string, message: any): Promise<number> {
    const messageString = typeof message === "string" ? message : JSON.stringify(message);
    return await this.client.publish(channel, messageString);
  }

  /**
   * Subscribe to a Redis channel
   * @param channel The channel to subscribe to
   * @param callback The callback to execute when a message is received
   */
  async subscribe(
    channel: string,
    callback: (message: string, channel: string) => void,
  ): Promise<void> {
    // Create a duplicate client for subscriptions if one doesn't exist yet
    if (!this.subscribeClient) {
      cliLogger.info('Creating Redis subscribe client for pub/sub operations');
      this.subscribeClient = new Redis({
        host: process.env.REDIS_URI ? process.env.REDIS_URI : "192.168.10.10",
        port: process.env.REDIS_PORT ? Number.parseInt(process.env.REDIS_PORT) : 6379,
        db: process.env.REDIS_DB ? Number.parseInt(process.env.REDIS_DB) : 0,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
      });

      // Add connection event handlers for subscribe client
      this.subscribeClient.on('connect', () => {
        cliLogger.info('Redis subscribe client connected');
      });
      
      this.subscribeClient.on('error', (err) => {
        cliLogger.error(`Redis subscribe client error: ${err.message}`);
      });

      this.subscribeClient.on('close', () => {
        cliLogger.info('Redis subscribe client connection closed');
      });

      // Set up the message handler
      this.subscribeClient.on("message", (channel, message) => {
        // Find and execute the callback for this channel
        const channelCallbacks = this.channelCallbacks.get(channel) || [];
        for (const callback of channelCallbacks) {
          try {
            callback(message, channel);
          } catch (error) {
            cliLogger.error(`Error in Redis message callback for channel ${channel}: ${error}`);
          }
        }
      });
    }

    // Store the callback
    const callbacks = this.channelCallbacks.get(channel) || [];
    callbacks.push(callback);
    this.channelCallbacks.set(channel, callbacks);

    // Subscribe to the channel
    try {
      await this.subscribeClient.subscribe(channel);
      cliLogger.info(`Subscribed to Redis channel: ${channel}`);
    } catch (error) {
      cliLogger.error(`Failed to subscribe to Redis channel ${channel}: ${error}`);
      throw error;
    }
  }

  /**
   * Unsubscribe from a Redis channel
   * @param channel The channel to unsubscribe from
   * @param callback Optional specific callback to remove
   */
  async unsubscribe(
    channel: string,
    callback?: (message: string, channel: string) => void,
  ): Promise<void> {
    if (!this.subscribeClient) return;

    if (callback) {
      // Remove specific callback
      const callbacks = this.channelCallbacks.get(channel) || [];
      const updatedCallbacks = callbacks.filter((cb) => cb !== callback);

      if (updatedCallbacks.length === 0) {
        // No more callbacks, unsubscribe from channel
        try {
          await this.subscribeClient.unsubscribe(channel);
          this.channelCallbacks.delete(channel);
          cliLogger.info(`Unsubscribed from Redis channel: ${channel}`);
        } catch (error) {
          cliLogger.error(`Failed to unsubscribe from Redis channel ${channel}: ${error}`);
        }
      } else {
        this.channelCallbacks.set(channel, updatedCallbacks);
      }
    } else {
      // Remove all callbacks for this channel
      try {
        await this.subscribeClient.unsubscribe(channel);
        this.channelCallbacks.delete(channel);
        cliLogger.info(`Unsubscribed from Redis channel: ${channel}`);
      } catch (error) {
        cliLogger.error(`Failed to unsubscribe from Redis channel ${channel}: ${error}`);
      }
    }

    // If no more subscriptions, close the subscribe client
    if (this.channelCallbacks.size === 0 && this.subscribeClient) {
      try {
        await this.subscribeClient.quit();
        this.subscribeClient = null;
        cliLogger.info('Redis subscribe client disconnected (no active subscriptions)');
      } catch (error) {
        cliLogger.error(`Error closing Redis subscribe client: ${error}`);
      }
    }
  }

  // Gracefully disconnect the Redis clients
  async disconnect(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    const disconnectPromises: Promise<any>[] = [];

    // Disconnect subscribe client first
    if (this.subscribeClient) {
      disconnectPromises.push(
        this.subscribeClient.quit().catch((error) => {
          cliLogger.error(`Error disconnecting Redis subscribe client: ${error}`);
        }).finally(() => {
          this.subscribeClient = null;
        })
      );
    }

    // Disconnect main client
    disconnectPromises.push(
      this.client.quit().catch((error) => {
        cliLogger.error(`Error disconnecting Redis main client: ${error}`);
      })
    );

    // Wait for all disconnections to complete
    await Promise.all(disconnectPromises);
    
    // Clear callbacks
    this.channelCallbacks.clear();
    
    cliLogger.info('All Redis connections closed');
  }

  /**
   * Check if Redis connections are healthy
   */
  async healthCheck(): Promise<{ main: boolean; subscribe: boolean }> {
    const mainHealthy = this.client.status === 'ready';
    const subscribeHealthy = this.subscribeClient ? this.subscribeClient.status === 'ready' : true;
    
    return {
      main: mainHealthy,
      subscribe: subscribeHealthy
    };
  }

  /**
   * Get detailed connection information for monitoring
   */
  getConnectionDetails() {
    return {
      main_client_status: this.client.status,
      subscribe_client_status: this.subscribeClient?.status || 'not_created',
      has_subscribe_client: !!this.subscribeClient,
      active_subscriptions: this.channelCallbacks.size,
      subscription_channels: Array.from(this.channelCallbacks.keys()),
      is_shutting_down: this.isShuttingDown
    };
  }
}

// Define a constant for the killmail channel
export const KILLMAIL_PUBSUB_CHANNEL = "killmail-broadcasts";

// Add this constant to the file's exports:
export const COMMENT_PUBSUB_CHANNEL = "comments:events";
