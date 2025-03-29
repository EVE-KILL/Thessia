#!/usr/bin/env bun
import { Command } from "commander";
import { initMongooseConnection } from "./server/helpers/Mongoose";
// Use the generated loader file
import { queueJobs } from "./src/queue/.loader";

const program = new Command();

// Create a connection flag
let mongooseConnected = false;

async function ensureMongooseConnection() {
  if (!mongooseConnected) {
    try {
      console.log("Initializing MongoDB connection...");
      await initMongooseConnection();
      mongooseConnected = true;
      console.log("MongoDB connection established");
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }
  return mongooseConnected;
}

async function main() {
  // Initialize database connection at startup
  await ensureMongooseConnection();

  // Register all queue jobs from the generated loader
  Object.entries(queueJobs).forEach(([name, jobModule]) => {
    program
      .command(name)
      .description(jobModule.description)
      .action(async (...args) => {
        try {
          const result = await jobModule.run({ args });
          return result;
        } catch (error) {
          console.error(`Error executing job ${name}:`, error);
          throw error;
        }
      });
  });

  program.parse(process.argv);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
