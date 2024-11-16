import { Worker, Queue } from "bullmq";

function createWorker(queueName: string, jobProcessor: any) {
    return new Worker(queueName, async job => {
        jobProcessor(job);
    }, {
        connection: {
            host: process.env.NODE_ENV === "production" ? process.env.REDIS_URI_PROD : process.env.REDIS_URI_DEV,
            port: 6379
        }
    });
}

function createQueue(name: string) {
  return new Queue(name, {
    connection: {
      host:
        process.env.NODE_ENV === "production"
          ? process.env.REDIS_URI_PROD
          : process.env.REDIS_URI_DEV,
      port: 6379,
    },
  });
}

export { createQueue, createWorker };
