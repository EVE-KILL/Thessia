import { Prices } from '../models/Prices';
import bz2 from 'unbzip2-stream';
import fetch from 'node-fetch';
import { pipeline, Readable } from 'stream';
import csvParser from 'csv-parser';
import { promisify } from 'util';

const pipe = promisify(pipeline);

export default defineTask({
  meta: {
    name: 'update:prices',
    description: 'Update the Prices using EVERef',
    payload: {
      days: {
        type: 'number',
        description: 'Number of days to update',
        required: false,
      },
      startFrom: {
        type: 'string',
        description: 'The date to start fetching prices from (YYYY-MM-DD)',
        required: false,
      },
      reverse: {
        type: 'boolean',
        description: 'Reverse the order of the price fetching',
        required: false,
      },
      historic: {
        type: 'boolean',
        description: 'Fetch all prices from the historic EVERef dataset',
        required: false,
      },
      debug: {
        type: 'boolean',
        description: 'Display error messages',
        required: false,
      },
    },
  },
  async run({ payload, context }) {
    const daysToFetch = payload.days || 7;
    const historicFetch = payload.historic || false;
    const oldestToNewest = payload.reverse || false;
    const startFrom = payload.startFrom || null;
    const debug = payload.debug || false;

    if (historicFetch) {
      console.log('Fetching historic prices...');
      await fetchHistoricPrices(oldestToNewest, startFrom, debug);
    } else {
      console.log(`Fetching prices for the last ${daysToFetch} days...`);
      await fetchPrices(daysToFetch, debug);
    }

    return { result: 'Prices updated' };
  },
});

async function fetchPrices(daysToFetch: number, debug: boolean) {
  for (let i = 0; i < daysToFetch; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    await processDate(dateString, debug);
  }
}

async function fetchHistoricPrices(
  oldestToNewest: boolean,
  startFrom: string | null,
  debug: boolean
) {
  let earliestDate = startFrom ? new Date(startFrom) : new Date('2003-10-01');
  const currentDate = new Date();
  const daysSinceOldestDate = Math.floor(
    (currentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (oldestToNewest) {
    for (let i = 0; i <= daysSinceOldestDate; i++) {
      const date = new Date(earliestDate);
      date.setDate(earliestDate.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      await processDate(dateString, debug);
    }
  } else {
    for (let i = 0; i <= daysSinceOldestDate; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      await processDate(dateString, debug);
    }
  }
}

async function processDate(date: string, debug: boolean) {
  try {
    const year = date.split('-')[0];
    const url = `https://data.everef.net/market-history/${year}/market-history-${date}.csv.bz2`;

    // Fetch the data
    const response = await fetch(url);
    if (!response.ok) {
      if (debug) {
        console.log(`No data available for ${date}`);
      }
      return;
    }

    console.log(`Processing market history for ${date}...`);

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
        .on('data', (data) => {
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
                if (debug) {
                  console.error(`Error inserting data for ${date}:`, error);
                }
                // Even if there's an error, we should resume the stream
                csvStream.resume();
              });
          }
        })
        .on('end', () => {
          if (batch.length > 0) {
            Prices.bulkWrite(batch, { ordered: false })
              .then((result) => {
                insertCount += result.upsertedCount + result.modifiedCount;
                console.log(`Inserted ${insertCount} prices for ${date}`);
                resolve();
              })
              .catch((error) => {
                if (debug) {
                  console.error(`Error inserting data at the end for ${date}:`, error);
                }
                resolve();
              });
          } else {
            console.log(`Inserted ${insertCount} prices for ${date}`);
            resolve();
          }
        })
        .on('error', (error) => {
          if (debug) {
            console.error(`Error processing data for ${date}:`, error);
          }
          reject(error);
        });
    });
  } catch (error) {
    if (debug) {
      console.error(`Error processing date ${date}:`, error);
    }
  }
}

function generateRecord(data: any) {
  return {
    type_id: parseInt(data['type_id'], 10),
    average: parseFloat(data['average']),
    highest: parseFloat(data['highest']),
    lowest: parseFloat(data['lowest']),
    region_id: parseInt(data['region_id'], 10),
    order_count: data['order_count'] ? parseInt(data['order_count'], 10) : 0,
    volume: data['volume'] ? parseInt(data['volume'], 10) : 0,
    date: new Date(data['date']),
  };
}
