import { Characters } from "../server/models/Characters";

export default {
  name: "backfill:lastactiveoncharacters",
  description: "Fills the last active on characters",
  longRunning: false,
  run: async () => {
    // Update all the characters missing last_active and set the date to 2007-06-01 00:00:00
    await Characters.updateMany(
      { last_active: { $exists: false } },
      { last_active: new Date("2007-06-01T00:00:00Z") },
    );
  },
};
