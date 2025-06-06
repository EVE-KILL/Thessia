import mongoose from 'mongoose';
import { cliLogger } from './Logger';

export const initMongooseConnection = async () => {
    // Use the MONGO_URI from environment variables with a fallback
    const connectionString = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/thessia';

    try {
        await mongoose.connect(connectionString, {
            // Add options needed for sharded cluster
            retryWrites: true,
            // If you're using MongoDB 4.4+, the following options are auto-configured
            // but you may want to explicitly set them
            maxPoolSize: 10,
            minPoolSize: 5
        });

        // Log connection success
        return mongoose.connection;
    } catch (error) {
        cliLogger.error(`MongoDB Connection Error: ${error}`);
        throw error;
    }
};

// This function already handles database-level sharding
export const enableSharding = async (dbName: string, collectionName: string, shardKey: object) => {
    try {
        const admin = mongoose.connection.db.admin();

        // 1. Enable sharding on the database
        try {
            await admin.command({ enableSharding: dbName });
            cliLogger.info(`Sharding enabled for database: ${dbName}`);
        } catch (err: any) {
            // Ignore if already enabled
            if (!err.message.includes('already enabled')) {
                cliLogger.warn(`Failed to enable sharding on database ${dbName}: ${err.message}`);
                throw err;
            }
        }

        // 2. Enable sharding on the collection with the specified shard key
        try {
            await admin.command({
                shardCollection: `${dbName}.${collectionName}`,
                key: shardKey
            });
            cliLogger.info(`Sharding enabled for collection: ${dbName}.${collectionName} with key: ${JSON.stringify(shardKey)}`);
        } catch (err: any) {
            // Ignore if already sharded
            if (!err.message.includes('already sharded')) {
                cliLogger.warn(`Failed to enable sharding on collection ${collectionName}: ${err.message}`);
                throw err;
            }
        }

        // Verify sharding is actually enabled
        const shardStatus = await verifyShardingStatus(dbName, collectionName);
        if (!shardStatus.isSharded) {
            cliLogger.warn(`Collection ${dbName}.${collectionName} is NOT sharded. Reason: ${shardStatus.reason}`);
            cliLogger.warn(`Your MongoDB operations will still work, but won't benefit from sharding.`);
            return false;
        }

        return true;
    } catch (error) {
        cliLogger.error(`Error enabling sharding: ${error}`);
        cliLogger.warn(`Collection will operate in non-sharded mode. This may limit scalability.`);
        return false;
    }
};

/**
 * Verifies if a collection is properly sharded
 * @param dbName Database name
 * @param collectionName Collection name
 * @returns Object indicating sharding status and reason if not sharded
 */
export const verifyShardingStatus = async (dbName: string, collectionName: string): Promise<{ isSharded: boolean, reason?: string }> => {
    try {
        const db = mongoose.connection.db;

        // Check if collection exists in sharded state
        const collStats = await db.command({ collStats: collectionName });

        if (!collStats.sharded) {
            return {
                isSharded: false,
                reason: 'Collection is not marked as sharded in collStats'
            };
        }

        // If collection is marked as sharded in collStats but has no chunks yet,
        // it's likely an empty or new collection, which is normal
        try {
            // Get the MongoDB client directly
            const client = mongoose.connection.getClient();

            // Access the config database
            const configDb = client.db('config');

            // Check for chunks
            const chunks = await configDb.collection('chunks')
                .find({ ns: `${dbName}.${collectionName}` })
                .toArray();

            if (!chunks || chunks.length === 0) {
                // This is normal for empty collections or collections with little data
                cliLogger.info(`No chunks found yet for ${dbName}.${collectionName}, but collection is marked as sharded. This is normal for new collections.`);
                return { isSharded: true };
            }
        } catch (configErr) {
            // If we can't access the config database, but collStats shows sharded=true,
            // we can consider it to be sharded (best effort verification)
            cliLogger.warn(`Could not verify chunks in config database: ${configErr}`);
            cliLogger.info(`Collection is marked as sharded in collStats, assuming sharding is active`);
        }

        return { isSharded: true };
    } catch (error) {
        return {
            isSharded: false,
            reason: `Error verifying sharding status: ${error}`
        };
    }
};
