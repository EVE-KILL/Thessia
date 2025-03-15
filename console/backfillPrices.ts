import { Prices } from "../server/models/Prices";
import bz2 from "unbzip2-stream";
import { Readable } from "node:stream";
import csvParser from "csv-parser";

export default {
  name: "backfill:prices",
  description: "Backfill all prices from EVERef",
  longRunning: false,
  run: async () => {
    console.log("Fetching historic prices...");
    await fetchHistoricPrices();

    return { result: "Prices updated" };
  },
};

async function fetchHistoricPrices() {
  const earliestDate = new Date("2007-12-05");
  const currentDate = new Date();
  const daysSinceOldestDate = Math.floor(
    (currentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  for (let i = 0; i <= daysSinceOldestDate; i++) {
    const date = new Date(earliestDate);
    date.setDate(earliestDate.getDate() + i);
    const dateString = date.toISOString().split("T")[0];
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
      console.log(`No data available for ${date}`);
      return;
    }

    console.log(`Processing market history for ${date}...`);

    // Convert the Web ReadableStream to a Node.js ReadableStream
    const nodeStream = Readable.fromWeb(response.body);

    // Decompress bz2 stream and parse CSV
    await new Promise<void>((resolve, reject) => {
      const batchSize = 100000;
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
                console.error(`Error inserting data for ${date}:`, error);
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
                console.log(`Inserted ${insertCount} prices for ${date}`);
                resolve();
              })
              .catch((error) => {
                console.error(`Error inserting data at the end for ${date}:`, error);
                resolve();
              });
          } else {
            console.log(`Inserted ${insertCount} prices for ${date}`);
            resolve();
          }
        })
        .on("error", (error) => {
          console.error(`Error processing data for ${date}:`, error);
          reject(error);
        });
    });
  } catch (error) {
    console.error(`Error processing date ${date}:`, error);
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
