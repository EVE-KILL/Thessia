import { initMongooseConnection } from "../helpers/Mongoose";
import { cliLogger } from "../helpers/Logger";

export default defineNitroPlugin(() => {
  initMongooseConnection().then(() => {
    cliLogger.info("✔ Connected to MongoDB");
  });
});
