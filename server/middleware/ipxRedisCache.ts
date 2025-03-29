import { Buffer } from "node:buffer";
import type { ServerResponse } from "node:http";
import { PassThrough, Readable, Writable } from "node:stream";
import { defineEventHandler, sendStream } from "h3";
import { RedisStorage } from "~/server/helpers/Storage";

// Cache duration constants in seconds
const CACHE_MAX_AGE = 604800; // 7 days
const CACHE_STALE_WHILE_REVALIDATE = 86400; // 1 day

// Redis key prefix
const KEY_PREFIX = "ipx:image:";
const TTL = 86400 * 2; // 2 days in seconds

export default defineEventHandler(async (event) => {
  const reqUrl = event.req.url || "";

  if (!reqUrl.startsWith("/_ipx/")) return;

  // Set cache control headers for IPX images
  event.res.setHeader(
    "Cache-Control",
    `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_STALE_WHILE_REVALIDATE}`,
  );

  const redisKey = `${KEY_PREFIX}${reqUrl}`;

  // Get Redis storage instance
  const storage = RedisStorage.getInstance();

  try {
    // Check if image exists in Redis cache
    const cachedImage = await storage.client.getBuffer(redisKey);

    if (cachedImage) {
      console.debug(`Serving image from Redis cache: ${reqUrl}`);

      // Update access time by refreshing TTL
      await storage.client.expire(redisKey, TTL);

      // Create a readable stream from the buffer
      const stream = new Readable();
      stream.push(cachedImage);
      stream.push(null); // End the stream

      return sendStream(event, stream);
    }
  } catch (err) {
    console.error(`Redis cache error: ${err}`);
  }

  // If not cached, capture and store the response
  const originalRes = event.res;
  const passThrough = new PassThrough();
  const captureStream = new CaptureStream();

  passThrough.pipe(captureStream);

  const originalWrite = originalRes.write.bind(originalRes) as (
    chunk: any,
    encoding?: BufferEncoding | ((error: Error | null | undefined) => void),
    callback?: (error: Error | null | undefined) => void,
  ) => boolean;

  const originalEnd = originalRes.end.bind(originalRes) as (
    chunk?: any,
    encoding?: BufferEncoding | ((error: Error | null | undefined) => void),
    callback?: () => void,
  ) => ServerResponse;

  originalRes.write = (
    chunk: any,
    encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void),
    callback?: (error: Error | null | undefined) => void,
  ): boolean => {
    passThrough.write(chunk, encodingOrCallback as BufferEncoding, callback);
    return originalWrite(chunk, encodingOrCallback as BufferEncoding, callback);
  };

  originalRes.end = (
    chunk?: any,
    encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void),
    callback?: () => void,
  ): ServerResponse => {
    if (chunk) passThrough.write(chunk, encodingOrCallback as BufferEncoding, callback);

    originalEnd(chunk, encodingOrCallback, callback);

    if (originalRes.statusCode !== 200) return originalRes;

    // Cache the image in Redis
    const buffer = captureStream.getBuffer();

    // Use the storage instance to set the cache with TTL
    storage.client
      .setex(redisKey, TTL, buffer)
      .then(() => {
        console.debug(`Cached image in Redis: ${reqUrl}`);
      })
      .catch((err) => {
        console.error(`Error caching image in Redis: ${err}`);
      });

    return originalRes;
  };

  return;
});

class CaptureStream extends Writable {
  private chunks: Buffer[];

  constructor(options?: any) {
    super(options);
    this.chunks = [];
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    callback();
  }

  getBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}
