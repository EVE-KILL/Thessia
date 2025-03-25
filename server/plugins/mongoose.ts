import { initMongooseConnection } from "~/server/helpers/Mongoose";
import { cliLogger } from "~/server/helpers/Logger";

export default defineNitroPlugin(() => {
  initMongooseConnection().then(() => {
    cliLogger.info("✔ Connected to MongoDB");
  });
});
