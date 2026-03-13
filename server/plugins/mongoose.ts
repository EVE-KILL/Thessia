import { cliLogger } from "../helpers/Logger";
import { initMongooseConnection } from "../helpers/Mongoose";
import { syncAllIndexes } from "../helpers/syncIndexes";

export default defineNitroPlugin(async () => {
    await initMongooseConnection();
    cliLogger.info("Connected to MongoDB");
    await syncAllIndexes();
});
