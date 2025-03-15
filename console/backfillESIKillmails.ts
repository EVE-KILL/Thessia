import fs from "node:fs";
import { exec as childProcessExec } from "node:child_process";
import util from "node:util";
import { KillmailsESI } from "../server/models/KillmailsESI";

export default {
  name: "backfill:esikillmails",
  description: "Backfill all ESI Killmails from EVERef",
  longRunning: false,
  run: async () => {
    await fetchESIKillmails();

    return { result: "Killmails backfilled" };
  },
};

async function fetchESIKillmails() {
  const earliestDate = new Date("2010-06-06");
  const currentDate = new Date();
  const daysSinceOldestDate = Math.floor(
    (currentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  for (let i = 0; i <= daysSinceOldestDate; i++) {
    const date = new Date(earliestDate);
    date.setDate(earliestDate.getDate() + i);
    const dateString = date.toISOString().split("T")[0];
    console.log(`Processing killmails for ${dateString}...`);
    await processDate(dateString);
  }
}

async function processDate(date: string) {
  const year = date.split("-")[0];
  const url = `https://data.everef.net/killmails/${year}/killmails-${date}.tar.bz2`;

  // Fetch the data
  const response = await fetch(url);
  if (!response.ok) {
    console.log(`No data available for ${date}`);
    return;
  }

  // Extract the .tar.bz2 to /tmp/killmails (Use the systems temp directory and bz2/tar to extract)
  const tmpDir = "/tmp/killmails";
  const tmpFile = `${tmpDir}/${date}.tar.bz2`;
  const tmpExtractDir = `${tmpDir}/${date}`;
  await fs.promises.mkdir(tmpDir, { recursive: true });
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(tmpFile, buffer);
  await fs.promises.mkdir(tmpExtractDir, { recursive: true });
  const exec = util.promisify(childProcessExec);
  await exec(`tar -xf ${tmpFile} -C ${tmpExtractDir}`);

  // Read the files in the extracted directory
  const files = await fs.promises.readdir(tmpExtractDir);
  const filesPath = `${tmpDir}/${date}/${files[0]}`;
  // Get a list of all files in the directory
  const killmailFiles = await fs.promises.readdir(filesPath);

  // Process each file
  const bulkOps = [];
  for (const file of killmailFiles) {
    // Read the file and parse its contents
    const fileContents = await fs.promises.readFile(`${filesPath}/${file}`);
    const killmail = JSON.parse(fileContents.toString());
    bulkOps.push({ insertOne: { document: killmail } });
  }
  let insertedCount = 0;
  let errorCount = 0;
  const totalCount = bulkOps.length;
  if (bulkOps.length) {
    try {
      const bulkResult = await KillmailsESI.collection.bulkWrite(bulkOps, { ordered: false });
      insertedCount = bulkResult.insertedCount;
    } catch (err: any) {
      if (err.errorResponse.writeErrors) {
        errorCount = err.errorResponse.writeErrors.length;
        insertedCount = err.insertedCount;
      }
    }
  }

  // Cleanup
  await fs.promises.rm(tmpFile, { force: true });
  await fs.promises.rm(tmpExtractDir, { recursive: true, force: true });

  console.log(
    `Inserted ${insertedCount} killmails for ${date}, with ${errorCount} errors out of ${totalCount} total killmails`,
  );
  return insertedCount;
}
