#!/usr/bin/env bun
import { CronExpressionParser } from "cron-parser";
import { cliLogger } from "./server/helpers/Logger";
import { initMongooseConnection } from "./server/helpers/Mongoose";
// Import the generated cron jobs
import { cronJobs } from "./src/cron/.loader";

interface CronJob {
  name: string;
  description: string;
  schedule: string;
  run: (args: any) => Promise<void>;
}

async function main() {
  // Initialize database connection
  await initMongooseConnection();

  // Emit table listing cronjob details
  console.table(
    cronJobs.map((job) => ({
      Name: job.name,
      Description: job.description,
      Schedule: job.schedule,
    })),
  );

  // New: Immediate run mode based on CLI argument
  if (process.argv[2]) {
    const jobName = process.argv[2];
    const job = cronJobs.find((job: CronJob) => job.name === jobName);
    if (job) {
      console.log(`Running job "${jobName}" immediately.`);
      job
        .run({ args: [] })
        .catch((err: any) => cliLogger.error(`Error executing job "${jobName}": ${err}`))
        .finally(() => process.exit(0));
    } else {
      console.error(`Job "${jobName}" not found.`);
      process.exit(1);
    }
  } else {
    // Single-run scheduled mode: run only jobs that are due now
    const now = Date.now();
    const tolerance = 60000; // 60 seconds tolerance
    const runningJobs: Promise<any>[] = [];
    for (const job of cronJobs) {
      try {
        // Parse expression and get the previous occurrence
        const interval = CronExpressionParser.parse(job.schedule);
        const prev = interval.prev();
        if (Math.abs(now - prev.getTime()) <= tolerance) {
          cliLogger.info(`Running job "${job.name}" on schedule: ${job.schedule}`);
          runningJobs.push(
            job.run({ args: [] }).catch((err: any) => {
              cliLogger.error(`Error in job "${job.name}": ${err}`);
              process.exit(1);
            }),
          );
        }
      } catch (e) {
        cliLogger.error(`Job "${job.name}" schedule error: ${job.schedule} - ${e}`);
      }
    }

    Promise.all(runningJobs)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
