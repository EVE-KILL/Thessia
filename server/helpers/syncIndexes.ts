import mongoose from "mongoose";
import { cliLogger } from "./Logger";

export async function syncAllIndexes() {
  const modelNames = mongoose.modelNames();
  cliLogger.info(`Syncing indexes for ${modelNames.length} models...`);

  for (const name of modelNames) {
    try {
      await mongoose.model(name).syncIndexes();
      cliLogger.info(`Synced indexes for ${name}`);
    } catch (error) {
      cliLogger.error(`Failed to sync indexes for ${name}:`, error);
    }
  }

  cliLogger.info("Index sync complete");
}
