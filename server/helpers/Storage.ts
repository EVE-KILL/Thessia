// src/helpers/Storage.ts
import Redis from "ioredis";

export class RedisStorage {
  // Static instance property
  private static instance: RedisStorage;

  // Redis client instance
  public client: Redis;

  // Private properties for pub/sub functionality
  private subscribeClient: Redis | null = null;
  private channelCallbacks: Map<string, Array<(message: string, channel: string) => void>> =
    new Map();

  // Private constructor to prevent direct instantiation
  public constructor() {
    this.client = new Redis({
      host: process.env.REDIS_URI ? process.env.REDIS_URI : "192.168.10.10",
      port: process.env.REDIS_PORT ? Number.parseInt(process.env.REDIS_PORT) : 6379,
      db: process.env.REDIS_DB ? Number.parseInt(process.env.REDIS_DB) : 0,
    });
  }

  // Static method to get the singleton instance
  public static getInstance(): RedisStorage {
    if (!RedisStorage.instance) {
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
      cliLogger.error("Failed to get Redis stats:", err);
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
      this.subscribeClient = new Redis({
        host: process.env.REDIS_URI ? process.env.REDIS_URI : "192.168.10.10",
        port: process.env.REDIS_PORT ? Number.parseInt(process.env.REDIS_PORT) : 6379,
        db: process.env.REDIS_DB ? Number.parseInt(process.env.REDIS_DB) : 0,
      });

      // Set up the message handler
      this.subscribeClient.on("message", (channel, message) => {
        // Find and execute the callback for this channel
        const channelCallbacks = this.channelCallbacks.get(channel) || [];
        for (const callback of channelCallbacks) {
          callback(message, channel);
        }
      });
    }

    // Store the callback
    const callbacks = this.channelCallbacks.get(channel) || [];
    callbacks.push(callback);
    this.channelCallbacks.set(channel, callbacks);

    // Subscribe to the channel
    await this.subscribeClient.subscribe(channel);
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
        await this.subscribeClient.unsubscribe(channel);
        this.channelCallbacks.delete(channel);
      } else {
        this.channelCallbacks.set(channel, updatedCallbacks);
      }
    } else {
      // Remove all callbacks for this channel
      await this.subscribeClient.unsubscribe(channel);
      this.channelCallbacks.delete(channel);
    }
  }

  // Optional: Gracefully disconnect the Redis client
  async disconnect(): Promise<void> {
    if (this.subscribeClient) {
      await this.subscribeClient.quit();
      this.subscribeClient = null;
    }
    await this.client.quit();
  }
}

// Define a constant for the killmail channel
export const KILLMAIL_PUBSUB_CHANNEL = "killmail-broadcasts";

// Add this constant to the file's exports:
export const COMMENT_PUBSUB_CHANNEL = "comments:events";
