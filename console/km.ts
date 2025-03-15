import { parseKillmail } from "../server/helpers/KillmailParser";
import { KillmailsESI } from "../server/models/KillmailsESI";
import { Killmails } from "../server/models/Killmails";

export default {
  name: "km",
  description: "Test command",
  longRunning: false,
  run: async () => {
    // Set processed to false on _ALL_ killmails in KillmailsESI
    //await KillmailsESI.updateMany(
    //  { processed: true},
    //  {
    //    $set: {
    //      processed: false,
    //    },
    //  },
    //);

    const esi = await KillmailsESI.findOne({ killmail_id: 125505982 });

    const km = await parseKillmail(esi, 0);

    const killmail = new Killmails(km);
    console.log(killmail);
    //await killmail.save();

    console.dir(JSON.stringify(killmail), { depth: null, colors: false });

    return { response: "Test command" };
  },
};
