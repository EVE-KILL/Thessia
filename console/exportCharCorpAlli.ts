import fs from "node:fs";
import path from "node:path";
import { Alliances } from "../server/models/Alliances";
import { Characters } from "../server/models/Characters";
import { Corporations } from "../server/models/Corporations";

export default {
  name: "export:charcorpalli",
  description: "Export all characters, corporations and alliances",
  longRunning: false,
  run: async () => {
    fs.mkdirSync(path.join(__dirname, "../data"), { recursive: true });

    fs.writeFileSync(path.join(__dirname, "../data/characters.json"), "[");
    let firstChar = true;
    const charCount = await Characters.countDocuments();
    let processedChars = 0;
    await Characters.find({})
      .lean()
      .cursor()
      .eachAsync((doc) => {
        processedChars++;
        if (processedChars % 100 === 0) console.log(`Characters: ${processedChars}/${charCount}`);
        if (!firstChar) fs.appendFileSync(path.join(__dirname, "../data/characters.json"), ",\n");
        fs.appendFileSync(path.join(__dirname, "../data/characters.json"), JSON.stringify(doc));
        firstChar = false;
      });
    fs.appendFileSync(path.join(__dirname, "../data/characters.json"), "]");

    fs.writeFileSync(path.join(__dirname, "../data/corporations.json"), "[");
    let firstCorp = true;
    const corpCount = await Corporations.countDocuments();
    let processedCorps = 0;
    await Corporations.find({})
      .lean()
      .cursor()
      .eachAsync((doc) => {
        processedCorps++;
        if (processedCorps % 100 === 0) console.log(`Corporations: ${processedCorps}/${corpCount}`);
        if (!firstCorp) fs.appendFileSync(path.join(__dirname, "../data/corporations.json"), ",\n");
        fs.appendFileSync(path.join(__dirname, "../data/corporations.json"), JSON.stringify(doc));
        firstCorp = false;
      });
    fs.appendFileSync(path.join(__dirname, "../data/corporations.json"), "]");

    fs.writeFileSync(path.join(__dirname, "../data/alliances.json"), "[");
    let firstAlli = true;
    const alliCount = await Alliances.countDocuments();
    let processedAlli = 0;
    await Alliances.find({})
      .lean()
      .cursor()
      .eachAsync((doc) => {
        processedAlli++;
        if (processedAlli % 100 === 0) console.log(`Alliances: ${processedAlli}/${alliCount}`);
        if (!firstAlli) fs.appendFileSync(path.join(__dirname, "../data/alliances.json"), ",\n");
        fs.appendFileSync(path.join(__dirname, "../data/alliances.json"), JSON.stringify(doc));
        firstAlli = false;
      });
    fs.appendFileSync(path.join(__dirname, "../data/alliances.json"), "]");

    console.log("Exported data in streaming mode");
  },
};
