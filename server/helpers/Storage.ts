// src/helpers/Storage.ts
import Redis from "ioredis";

export class RedisStorage {
  // Static instance property
  private static instance: RedisStorage;

  // Redis client instance
  public client: Redis;

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
  async set(key: string, value: any): Promise<void> {
    await this.client.set(key, value);
  }

  async get(key: string): Promise<any | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // Optional: Gracefully disconnect the Redis client
  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
