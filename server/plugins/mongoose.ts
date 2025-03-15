import { initMongooseConnection } from "../helpers/Mongoose";

export default defineNitroPlugin(() => {
  initMongooseConnection().then(() => {
    console.log("✔ Connected to MongoDB");
  });
});
