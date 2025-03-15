import fs from "node:fs";
import { glob } from "glob";
import { KillmailsESI } from "../server/models/KillmailsESI";
import { Wars } from "../server/models/Wars";
import { addKillmail } from "../server/queue/Killmail";

export default {
  name: "backfill:wars_everef",
  description: "Backfill all wars from EVERef",
  longRunning: false,
  run: async () => {
    const tmpDir = "/Users/karbowiak/data/data.everef.net/wars/history/";
    // Find all the folders in the directory
    const folders = fs
      .readdirSync(tmpDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    // Loop through all the folders, and find all the json files inside
    for (const folder of folders) {
      const files = glob.sync(`${tmpDir}/${folder}/**/*.json`);
      console.log(`Processing folder ${folder}...`);

      for (const file of files) {
        // Get file name minus .json extension
        const warId = file.split("/").pop().split(".")[0];
        const data = await fs.promises.readFile(file, "utf8");
        const wars = JSON.parse(data);
        const war = new Wars(wars);
        try {
          await war.save();
        } catch (err) {
          await Wars.updateOne({ war_id: war.war_id }, wars);
        }

        // Now, wars on the disk can also have a folder with the same name, minus the .json extension
        // Check if there is a folder like that
        const folder = file.replace(".json", "");
        if (fs.existsSync(folder)) {
          // Get all the killmails in the /killmails folder under the war folder
          const killmails = glob.sync(`${folder}/killmails/*.json`);
          for (const killmailFile of killmails) {
            const kmData = await fs.promises.readFile(killmailFile, "utf8");
            const km = JSON.parse(kmData);
            const killmail = new KillmailsESI(km);
            try {
              await killmail.save();
            } catch (err) {
              console.error(`Error saving killmail ${killmail.killmail_id}:`, err);
              await KillmailsESI.updateOne({ killmail_id: killmail.killmail_id }, km);
            }
            // Add the killmail to the queue
            await addKillmail(km.killmail_id, km.killmail_hash, km.war_id, 100);
          }
        }
      }

      // We are done processing the folder, lets remove it and all it's content
      fs.rmdirSync(`${tmpDir}/${folder}`, { recursive: true });
    }
  },
};
