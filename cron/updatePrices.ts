import { cliLogger } from "../server/helpers/Logger";
import { Prices } from "../server/models/Prices";
import bz2 from "unbzip2-stream";
import { Readable } from "node:stream";
import csvParser from "csv-parser";

export default {
  name: "updatePrices",
  description: "Fetch the latest prices from EVERef",
  schedule: "0 * * * *",
  run: async () => {
    const daysToFetch = 7;

    cliLogger.info(`Fetching prices for the last ${daysToFetch} days...`);
    await fetchPrices(daysToFetch);

    return cliLogger.info("Prices updated");
  },
};

async function fetchPrices(daysToFetch: number) {
  for (let i = 0; i < daysToFetch; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split("T")[0]; // 'YYYY-MM-DD'
    await processDate(dateString);
  }
}

async function processDate(date: string) {
  try {
    const year = date.split("-")[0];
    const url = `https://data.everef.net/market-history/${year}/market-history-${date}.csv.bz2`;

    // Fetch the data
    const response = await fetch(url);
    if (!response.ok) {
      return cliLogger.info(`No data available for ${date}`);
    }

    cliLogger.info(`Processing market history for ${date}...`);

    // Convert the Web ReadableStream to a Node.js ReadableStream
    const nodeStream = Readable.fromWeb(response.body);

    // Decompress bz2 stream and parse CSV
    await new Promise<void>((resolve, reject) => {
      const batchSize = 5000;
      let batch: any[] = [];
      let insertCount = 0;

      const decompressedStream = nodeStream.pipe(bz2());
      const csvStream = decompressedStream.pipe(csvParser());

      csvStream
        .on("data", (data) => {
          const record = generateRecord(data);
          batch.push({
            updateOne: {
              filter: {
                type_id: record.type_id,
                region_id: record.region_id,
                date: record.date,
              },
              update: { $set: record },
              upsert: true,
            },
          });
          if (batch.length >= batchSize) {
            // Pause the stream
            csvStream.pause();
            Prices.bulkWrite(batch, { ordered: false })
              .then((result) => {
                insertCount += result.upsertedCount + result.modifiedCount;
                batch = [];
                // Resume the stream
                csvStream.resume();
              })
              .catch((error) => {
                cliLogger.error(`Error inserting data for ${date}: ${error}`);
                // Even if there's an error, we should resume the stream
                csvStream.resume();
              });
          }
        })
        .on("end", () => {
          if (batch.length > 0) {
            Prices.bulkWrite(batch, { ordered: false })
              .then((result) => {
                insertCount += result.upsertedCount + result.modifiedCount;
                cliLogger.info(`Inserted ${insertCount} prices for ${date}`);
                resolve();
              })
              .catch((error) => {
                cliLogger.error(`Error inserting data at the end for ${date}: ${error}`);
                resolve();
              });
          } else {
            cliLogger.info(`Inserted ${insertCount} prices for ${date}`);
            resolve();
          }
        })
        .on("error", (error) => {
          cliLogger.error(`Error processing data for ${date}: ${error}`);
          reject(error);
        });
    });
  } catch (error) {
    cliLogger.error(`Error processing date ${date}: ${error}`);
  }
}

function generateRecord(data: any) {
  return {
    type_id: Number.parseInt(data.type_id, 10),
    average: Number.parseFloat(data.average),
    highest: Number.parseFloat(data.highest),
    lowest: Number.parseFloat(data.lowest),
    region_id: Number.parseInt(data.region_id, 10),
    order_count: data.order_count ? Number.parseInt(data.order_count, 10) : 0,
    volume: data.volume ? Number.parseInt(data.volume, 10) : 0,
    date: new Date(data.date),
  };
}
