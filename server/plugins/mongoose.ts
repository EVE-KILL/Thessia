import { cliLogger } from "~/server/helpers/Logger";
import { initMongooseConnection } from "~/server/helpers/Mongoose";

export default defineNitroPlugin(() => {
  initMongooseConnection().then(() => {
    cliLogger.info("✔ Connected to MongoDB");
  });
});
