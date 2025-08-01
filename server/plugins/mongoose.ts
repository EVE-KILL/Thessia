import { cliLogger } from "../helpers/Logger";
import { initMongooseConnection } from "../helpers/Mongoose";

export default defineNitroPlugin(() => {
    initMongooseConnection().then(() => {
        cliLogger.info("✔ Connected to MongoDB");
    });
});
