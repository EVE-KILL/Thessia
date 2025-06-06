import mongoose from 'mongoose';
import { cliLogger } from "~/server/helpers/Logger";
import { initMongooseConnection } from "~/server/helpers/Mongoose";

export default {
    name: "mongodbBalancer",
    description: "MongoDB sharding balancer management tools",
    longRunning: false,
    run: async (args: string[] = []) => {
        // Ensure MongoDB connection is established
        await initMongooseConnection();

        const command = args[0] || 'status';

        switch (command) {
            case 'status':
                await showBalancerStatus();
                break;
            case 'start':
                await setBalancerState(true);
                break;
            case 'stop':
                await setBalancerState(false);
                break;
            case 'forcestart':
                await forceStartBalancer();
                break;
            case 'needed':
                await checkIfBalancerNeeded();
                break;
            case 'chunks':
                await showChunkDistribution();
                break;
            case 'collections':
                await showShardedCollections();
                break;
            case 'debug':
                await showDebugInfo();
                break;
            default:
                showHelp();
        }

        // Close the MongoDB connection
        await mongoose.connection.close();
    },
};

/**
 * Shows the current chunk distribution across shards for all sharded collections
 */
async function showChunkDistribution() {
    try {
        const configDB = mongoose.connection.getClient().db('config');

        // Fetch all collections from config database first, without filtering
        const allCollections = await configDB.collection('collections').find({}).toArray();
        cliLogger.info(`Found ${allCollections.length} total collections in config.collections`);

        // Filter active collections (not explicitly marked as dropped)
        const collections = allCollections.filter(c => c.dropped !== true);

        if (collections.length === 0) {
            cliLogger.info('No active sharded collections found');
            return;
        }

        cliLogger.info(`Found ${collections.length} active sharded collections`);

        // Get all shards
        const shards = await configDB.collection('shards').find({}).toArray();
        const shardNames = shards.map(s => s._id);

        // For each collection, show chunk distribution
        for (const collection of collections) {
            const ns = collection._id;
            if (!ns || typeof ns !== 'string' || !ns.includes('.')) {
                cliLogger.warn(`Skipping collection with invalid namespace: ${JSON.stringify(ns)}`);
                continue;
            }

            cliLogger.info(`\nCollection: ${ns}`);
            cliLogger.info(`Shard key: ${JSON.stringify(collection.key)}`);

            // Get chunks for this collection
            const chunks = await configDB.collection('chunks').find({ ns }).toArray();

            if (chunks.length === 0) {
                cliLogger.info(`No chunks found for collection ${ns}`);
                continue;
            }

            // Count chunks per shard
            const countByShards: Record<string, number> = {};
            shardNames.forEach(name => countByShards[name] = 0);

            chunks.forEach(chunk => {
                countByShards[chunk.shard] = (countByShards[chunk.shard] || 0) + 1;
            });

            // Display chunk distribution
            cliLogger.info(`Total chunks: ${chunks.length}`);
            cliLogger.info('Chunk distribution:');
            for (const [shard, count] of Object.entries(countByShards)) {
                const percentage = chunks.length > 0 ? (count / chunks.length * 100).toFixed(2) : '0.00';
                cliLogger.info(`  - ${shard}: ${count} chunks (${percentage}%)`);
            }

            // Check for imbalance
            const counts = Object.values(countByShards).filter(c => c > 0);
            if (counts.length > 1) {
                const min = Math.min(...counts);
                const max = Math.max(...counts);
                const imbalance = max - min;
                const imbalancePercentage = (imbalance / max * 100).toFixed(2);

                if (imbalance > 0) {
                    cliLogger.info(`Chunk imbalance: ${imbalance} chunks (${imbalancePercentage}% difference)`);
                    if (parseFloat(imbalancePercentage) > 10) {
                        cliLogger.warn('Significant imbalance detected (>10%)');
                    }
                } else {
                    cliLogger.info('Chunks are perfectly balanced');
                }
            }
        }
    } catch (error) {
        cliLogger.error(`Failed to get chunk distribution: ${error}`);
    }
}

/**
 * Shows all sharded collections in the database
 */
async function showShardedCollections() {
    try {
        const configDB = mongoose.connection.getClient().db('config');

        // Fetch all collections from config database first, without filtering
        const allCollections = await configDB.collection('collections').find({}).toArray();
        cliLogger.info(`Found ${allCollections.length} total collections in config.collections`);

        // Filter active collections (not explicitly marked as dropped)
        const collections = allCollections.filter(c => c.dropped !== true);

        if (collections.length === 0) {
            cliLogger.info('No active sharded collections found');
            return;
        }

        cliLogger.info(`Found ${collections.length} active sharded collections:`);

        for (const collection of collections) {
            const ns = collection._id;
            if (!ns || typeof ns !== 'string' || !ns.includes('.')) {
                cliLogger.warn(`Skipping collection with invalid namespace: ${JSON.stringify(ns)}`);
                continue;
            }

            const [dbName, collName] = ns.split('.');

            // Get stats for this collection to verify sharding status
            try {
                const db = mongoose.connection.getClient().db(dbName);
                const stats = await db.command({ collStats: collName });

                cliLogger.info(`\nCollection: ${ns}`);
                cliLogger.info(`Shard key: ${JSON.stringify(collection.key)}`);
                cliLogger.info(`Sharded: ${stats.sharded ? 'Yes' : 'No'}`);
                cliLogger.info(`Size: ${formatSize(stats.size)}`);

                if (stats.sharded) {
                    cliLogger.info('Shard distribution:');
                    for (const [shard, data] of Object.entries(stats.shards || {})) {
                        const shardData = data as any;
                        cliLogger.info(`  - ${shard}: ${formatSize(shardData.size)} (${shardData.count} documents)`);
                    }
                }

                // Show chunk count for this collection
                const chunkCount = await configDB.collection('chunks').countDocuments({ ns });
                cliLogger.info(`Chunks: ${chunkCount}`);

            } catch (err) {
                cliLogger.warn(`Could not get stats for ${ns}: ${err}`);
            }
        }
    } catch (error) {
        cliLogger.error(`Failed to get sharded collections: ${error}`);
    }
}

/**
 * Shows the current MongoDB balancer status
 */
async function showBalancerStatus() {
    try {
        const admin = mongoose.connection.db.admin();
        const result = await admin.command({ balancerStatus: 1 });

        cliLogger.info('Balancer Status:');
        cliLogger.info(`  - Currently running: ${result.inBalancerRound ? 'Yes' : 'No'}`);
        cliLogger.info(`  - Balancer enabled: ${result.mode === 'full' ? 'Yes' : 'No'}`);

        // Get more detailed balancer info from config.settings
        const configDB = mongoose.connection.getClient().db('config');
        const settings = await configDB.collection('settings').findOne({ _id: 'balancer' });

        if (settings) {
            cliLogger.info('Balancer Configuration:');
            if (settings.activeWindow) {
                cliLogger.info(`  - Active window: ${settings.activeWindow.start} - ${settings.activeWindow.stop}`);
            } else {
                cliLogger.info('  - Active window: 24/7 (No restrictions)');
            }

            if (settings.stopped) {
                cliLogger.info('  - Balancer is explicitly stopped');
            }
        }

        // Show any currently migrating chunks
        const locks = await configDB.collection('locks').find({ state: 2 }).toArray();
        if (locks && locks.length > 0) {
            cliLogger.info(`Active migrations: ${locks.length}`);
            for (const lock of locks) {
                cliLogger.info(`  - ${lock._id}: ${lock.who}`);
            }
        } else {
            // Check if any migrations might be happening but not showing up in locks
            const migrations = await configDB.collection('changelog')
                .find({ what: /^moveChunk/, time: { $gte: new Date(Date.now() - 60000) } })
                .sort({ time: -1 })
                .limit(5)
                .toArray();

            if (migrations && migrations.length > 0) {
                cliLogger.info(`Recent migrations (last minute): ${migrations.length}`);
                for (const migration of migrations) {
                    const details = typeof migration.details === 'object'
                        ? JSON.stringify(migration.details)
                        : migration.details;

                    cliLogger.info(`  - ${migration.time}: ${migration.what} - ${details}`);
                }
            } else {
                cliLogger.info('No active migrations');
            }
        }
    } catch (error) {
        cliLogger.error(`Failed to get balancer status: ${error}`);
    }
}

/**
 * Starts or stops the MongoDB balancer
 */
async function setBalancerState(enable: boolean) {
    try {
        const admin = mongoose.connection.db.admin();
        const command = enable ? { balancerStart: 1 } : { balancerStop: 1 };

        await admin.command(command);
        cliLogger.info(`Balancer ${enable ? 'started' : 'stopped'} successfully`);

        // Verify the new state
        await showBalancerStatus();
    } catch (error) {
        cliLogger.error(`Failed to ${enable ? 'start' : 'stop'} balancer: ${error}`);
    }
}

/**
 * Force starts the MongoDB balancer regardless of scheduling windows
 */
async function forceStartBalancer() {
    try {
        const admin = mongoose.connection.db.admin();
        const configDB = mongoose.connection.getClient().db('config');

        // 1. First, make sure any stopped flag in the settings is removed
        await configDB.collection('settings').updateOne(
            { _id: 'balancer' },
            { $set: { stopped: false } },
            { upsert: true }
        );

        // 2. Clear any active window restrictions
        await configDB.collection('settings').updateOne(
            { _id: 'balancer' },
            { $unset: { activeWindow: "" } },
            { upsert: true }
        );

        // 3. Now start the balancer
        await admin.command({ balancerStart: 1 });

        cliLogger.info('Balancer force started successfully');
        cliLogger.info('Active window restrictions removed');
        cliLogger.info('Manual stop flag cleared');

        // 4. Verify the new state
        await showBalancerStatus();
    } catch (error) {
        cliLogger.error(`Failed to force start balancer: ${error}`);
    }
}

/**
 * Determines if balancer has any work to do and why it might not be running
 */
async function checkIfBalancerNeeded() {
    try {
        const configDB = mongoose.connection.getClient().db('config');

        // 1. Check how many shards we have
        const shards = await configDB.collection('shards').find({}).toArray();
        if (shards.length < 2) {
            cliLogger.warn(`Balancer has nothing to do: Only ${shards.length} shard(s) in the cluster.`);
            cliLogger.info(`At least 2 shards are required for the balancer to migrate chunks.`);
            return;
        }

        // 2. Check if we have any sharded collections
        const collections = await configDB.collection('collections').find({ dropped: false }).toArray();
        if (collections.length === 0) {
            cliLogger.warn(`Balancer has nothing to do: No sharded collections.`);
            return;
        }

        // 3. Check chunk distribution
        let imbalancedCollections = 0;
        let totalImbalance = 0;

        for (const collection of collections) {
            const ns = collection._id;

            // Count chunks per shard
            const chunksPerShard: Record<string, number> = {};
            shards.forEach(s => chunksPerShard[s._id] = 0);

            const chunks = await configDB.collection('chunks').find({ ns }).toArray();
            chunks.forEach(chunk => {
                chunksPerShard[chunk.shard] = (chunksPerShard[chunk.shard] || 0) + 1;
            });

            // Check for imbalance
            const counts = Object.values(chunksPerShard);
            if (counts.length > 1 && Math.max(...counts) > 0) {
                const min = Math.min(...counts);
                const max = Math.max(...counts);
                const imbalance = max - min;

                // MongoDB's threshold is typically 8 chunks or ~10%
                if (imbalance >= 8) {
                    imbalancedCollections++;
                    totalImbalance += imbalance;

                    cliLogger.info(`Collection ${ns} is imbalanced by ${imbalance} chunks`);
                    // Show distribution
                    for (const [shard, count] of Object.entries(chunksPerShard)) {
                        const percentage = chunks.length > 0 ? (count / chunks.length * 100).toFixed(2) : '0.00';
                        cliLogger.info(`  - ${shard}: ${count} chunks (${percentage}%)`);
                    }
                }
            }
        }

        // Summary
        if (imbalancedCollections > 0) {
            cliLogger.info(`\nFound ${imbalancedCollections} imbalanced collections with total imbalance of ${totalImbalance} chunks.`);
            cliLogger.info(`The balancer should start migrating chunks soon.`);
        } else {
            cliLogger.info(`\nNo significant chunk imbalance detected.`);
            cliLogger.info(`The balancer has nothing to do right now.`);
        }

    } catch (error) {
        cliLogger.error(`Failed to check if balancer is needed: ${error}`);
    }
}

/**
 * Shows detailed debug information about MongoDB's sharding configuration
 */
async function showDebugInfo() {
    try {
        const admin = mongoose.connection.db.admin();

        // 1. Check if we're connected to a sharded cluster
        const status = await admin.serverStatus();
        cliLogger.info(`Process type: ${status.process || 'unknown'}`);
        cliLogger.info(`MongoDB version: ${status.version}`);
        cliLogger.info(`Sharding enabled: ${status.sharding ? 'Yes' : 'No'}`);

        // 2. Get the topology of the cluster
        try {
            const sh = await admin.command({ listShards: 1 });
            cliLogger.info('\nShard list:');
            sh.shards.forEach((shard: any) => {
                cliLogger.info(`  - ${shard._id}: ${shard.host}`);
            });
        } catch (error) {
            cliLogger.warn(`Could not list shards: ${error}`);
        }

        // 3. Check the config database
        try {
            const configDB = mongoose.connection.getClient().db('config');

            const collections = await configDB.collection('collections').find({}).toArray();
            cliLogger.info('\nSharded collections in config.collections:');
            if (collections.length === 0) {
                cliLogger.info('  No collections registered for sharding');
            } else {
                collections.forEach((coll: any) => {
                    cliLogger.info(`  - ${coll._id}: ${JSON.stringify(coll.key)} (dropped: ${coll.dropped || false})`);
                });
            }

            // Check if there are any pending operations
            const changelog = await configDB.collection('changelog')
                .find({})
                .sort({ time: -1 })
                .limit(5)
                .toArray();

            cliLogger.info('\nRecent changelog entries:');
            if (changelog.length === 0) {
                cliLogger.info('  No recent changelog entries');
            } else {
                changelog.forEach((entry: any) => {
                    // Fix the [object Object] issue by properly stringifying the details
                    const details = typeof entry.details === 'object'
                        ? JSON.stringify(entry.details, null, 2)
                        : entry.details;

                    cliLogger.info(`  - ${entry.time}: ${entry.what} - ${details}`);
                });
            }

            // Check database sharding status
            const databases = await configDB.collection('databases').find({}).toArray();
            cliLogger.info('\nSharded databases:');
            if (databases.length === 0) {
                cliLogger.info('  No databases registered for sharding');
            } else {
                databases.forEach((db: any) => {
                    cliLogger.info(`  - ${db._id}: primary=${db.primary}, partitioned=${db.partitioned || false}`);
                });
            }
        } catch (error) {
            cliLogger.error(`Could not access config database: ${error}`);
        }

        // 4. Check application database status
        try {
            const dbName = mongoose.connection.db.databaseName;
            const stats = await admin.command({ listDatabases: 1 });
            const dbInfo = stats.databases.find((db: any) => db.name === dbName);

            cliLogger.info(`\nApplication database (${dbName}):`, dbInfo);

            // Check collections in the application database
            const collections = await mongoose.connection.db.listCollections().toArray();
            cliLogger.info(`\nCollections in ${dbName}:`);
            for (const collection of collections) {
                const collStats = await mongoose.connection.db.command({ collStats: collection.name });
                cliLogger.info(`  - ${collection.name}: sharded=${collStats.sharded || false}, size=${formatSize(collStats.size || 0)}`);
            }
        } catch (error) {
            cliLogger.error(`Error getting database information: ${error}`);
        }
    } catch (error) {
        cliLogger.error(`Error during debug: ${error}`);
    }
}

/**
 * Formats a size in bytes to a human-readable string
 */
function formatSize(sizeInBytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = sizeInBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Shows help for this command
 */
function showHelp() {
    cliLogger.info('MongoDB Balancer Management');
    cliLogger.info('Usage: node console.js mongodbBalancer [command]');
    cliLogger.info('');
    cliLogger.info('Commands:');
    cliLogger.info('  status       Show balancer status (default)');
    cliLogger.info('  start        Start the balancer');
    cliLogger.info('  stop         Stop the balancer');
    cliLogger.info('  forcestart   Force start the balancer ignoring time windows and manual stops');
    cliLogger.info('  needed       Check if the balancer has any work to do');
    cliLogger.info('  chunks       Show chunk distribution');
    cliLogger.info('  collections  Show sharded collections');
    cliLogger.info('  debug        Show detailed debugging information');
}
