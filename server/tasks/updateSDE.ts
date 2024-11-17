import { Config } from "../models/Config";
import bz2 from "unbzip2-stream";
import { promisify } from "util";
import { pipeline, Readable } from "stream";
import fs from "fs";
import fetch from "node-fetch";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Import Models
import { Celestials } from "../models/Celestials";
import { InvFlags } from "../models/InvFlags";
import { InvTypes } from "../models/InvTypes";
import { Factions } from "../models/Factions";
import { InvGroups } from "../models/InvGroups";
import { SolarSystems } from "../models/SolarSystems";
import { Regions } from "../models/Regions";
import { Constellations } from "../models/Constellations";

const pipe = promisify(pipeline);

export default defineTask({
    meta: {
        name: "update:sde",
        description: "Update the SDE",
    },
    async run({ payload, context }) {
        console.log("Updating SDE");
        const sqliteUrl = "https://www.fuzzwork.co.uk/dump/sqlite-latest.sqlite.bz2";
        const sqliteMd5Url = "https://www.fuzzwork.co.uk/dump/sqlite-latest.sqlite.bz2.md5";
        const localDbPath = "/tmp/sqlite-latest.sqlite";

        // Fetch remote MD5
        const remoteMd5Response = await fetch(sqliteMd5Url);
        const remoteMd5Text = await remoteMd5Response.text();
        const [checksum] = remoteMd5Text.split(" ");

        // Fetch local MD5 from Config
        const localMd5Config = await Config.findOne({ key: "sde:sqlite:md5" });
        const localMd5 = localMd5Config ? localMd5Config.value : null;

        if (localMd5 === checksum) {
            console.log("SDE is up to date");
            return { result: "SDE is up to date" };
        }

        // Download and decompress the .bz2 file
        const response = await fetch(sqliteUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${sqliteUrl}`);
        }

        console.log("Downloading SDE...");
        const writeStream = fs.createWriteStream(localDbPath);

        // Convert the Web ReadableStream to a Node.js ReadableStream
        const nodeStream = Readable.fromWeb(response.body);

        // Use the pipeline to handle the stream
        await pipe(nodeStream, bz2(), writeStream);

        await updateCelestials();
        await updateSolarSystems();
        await updateRegions();
        await updateConstellations();
        await invTypes();
        await factions();
        await invFlags();
        await invGroups();

        // Update the local MD5 checksum
        await Config.updateOne(
            { key: "sde:sqlite:md5" },
            { value: checksum },
            { upsert: true }
        );

        console.log("SDE updated successfully.");
        return { result: "SDE updated successfully" };
    }
});

async function invTypes() {
    const db = await connectToDatabase();
    const results = await db?.all(`
        SELECT
        invTypes.typeID AS type_id,
        invTypes.groupID AS group_id,
        invTypes.typeName AS type_name,
        invTypes.description AS description,
        invTypes.mass AS mass,
        invTypes.volume AS volume,
        invTypes.capacity AS capacity,
        invTypes.portionSize AS portion_size,
        invTypes.raceID AS race_id,
        invTypes.basePrice AS base_price,
        invTypes.published AS published,
        invTypes.marketGroupID AS market_group_id,
        invTypes.iconID AS icon_id,
        invTypes.soundID AS sound_id,
        invTypes.graphicID AS graphic_id
        FROM invTypes
    `);

    console.log(`Found ${results.length} invTypes`);

    const bulkOps = results.map((result) => ({
        updateOne: {
            filter: { type_id: result.type_id },
            update: { $set: result },
            upsert: true,
        },
    }));

    if (bulkOps.length > 0) {
        const response = await InvTypes.bulkWrite(bulkOps);
        console.log(`Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`);
    }
}

async function factions() {
    const db = await connectToDatabase();
    const results = await db?.all(`
        SELECT
        chrFactions.factionID AS faction_id,
        chrFactions.factionName AS name,
        chrFactions.description AS description,
        chrFactions.raceIDs AS race_ids,
        chrFactions.solarSystemID AS solar_system_id,
        chrFactions.corporationID AS corporation_id,
        chrFactions.sizeFactor AS size_factor,
        chrFactions.stationCount AS station_count,
        chrFactions.stationSystemCount AS station_system_count,
        chrFactions.militiaCorporationID AS militia_corporation_id,
        chrFactions.iconID AS icon_id
        FROM chrFactions
    `);

    console.log(`Found ${results.length} factions`);

    const bulkOps = results.map((result) => ({
        updateOne: {
            filter: { faction_id: result.faction_id },
            update: { $set: result },
            upsert: true,
        },
    }));

    if (bulkOps.length > 0) {
        const response = await Factions.bulkWrite(bulkOps);
        console.log(`Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`);
    }
}

async function invFlags() {
    const db = await connectToDatabase();
    const results = await db?.all(`
        SELECT
        invFlags.flagID AS flag_id,
        invFlags.flagName AS flag_name,
        invFlags.flagText AS flag_text,
        invFlags.orderID AS order_id
        FROM invFlags
    `);

    console.log(`Found ${results.length} invFlags`);

    const bulkOps = results.map((result) => ({
        updateOne: {
            filter: { flag_id: result.flag_id },
            update: { $set: result },
            upsert: true,
        },
    }));

    if (bulkOps.length > 0) {
        const response = await InvFlags.bulkWrite(bulkOps);
        console.log(`Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`);
    }
}


async function invGroups() {
    const db = await connectToDatabase();
    const results = await db?.all(`
        SELECT
        invGroups.groupID AS group_id,
        invGroups.categoryID AS category_id,
        invGroups.groupName AS group_name,
        invGroups.iconID AS icon_id,
        invGroups.useBasePrice AS use_base_price,
        invGroups.anchored AS anchored,
        invGroups.anchorable AS anchorable,
        invGroups.fittableNonSingleton AS fittable_non_singleton,
        invGroups.published AS published
        FROM invGroups
    `);

    console.log(`Found ${results.length} invGroups`);

    const bulkOps = results.map((result) => ({
        updateOne: {
            filter: { group_id: result.group_id },
            update: { $set: result },
            upsert: true,
        },
    }));

    if (bulkOps.length > 0) {
        const response = await InvGroups.bulkWrite(bulkOps);
        console.log(`Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`);
    }
}

async function updateCelestials() {
    const db = await connectToDatabase();

    const results = await db?.all(`
        SELECT
            mapDenormalize.itemID AS item_id,
            invNames.itemName AS item_name,
            invTypes.typeName AS type_name,
            mapDenormalize.typeID AS type_id,
            mapSolarSystems.solarSystemName AS solar_system_name,
            mapDenormalize.solarSystemID AS solar_system_id,
            mapDenormalize.constellationID AS constellation_id,
            mapDenormalize.regionID AS region_id,
            mapRegions.regionName AS region_name,
            mapDenormalize.orbitID AS orbit_id,
            mapDenormalize.x AS x,
            mapDenormalize.y AS y,
            mapDenormalize.z AS z
        FROM
            mapDenormalize
            JOIN invTypes ON mapDenormalize.typeID = invTypes.typeID
            JOIN invNames on mapDenormalize.itemID = invNames.itemID
            JOIN mapSolarSystems ON mapSolarSystems.solarSystemID = mapDenormalize.solarSystemID
            JOIN mapRegions ON mapDenormalize.regionID = mapRegions.regionID
            JOIN mapConstellations ON mapDenormalize.constellationID = mapConstellations.constellationID
    `);

    // Emit the count of found results
    console.log(`Found ${results.length} Celestials`);

    // Prepare bulk operations
    const bulkOps = results.map((result) => ({
        updateOne: {
            filter: { item_id: result.item_id }, // Match document by item_id
            update: { $set: result },           // Set the fields from the result
            upsert: true,                       // Insert if not found
        },
    }));

    // Perform bulk operation
    if (bulkOps.length > 0) {
        const response = await Celestials.bulkWrite(bulkOps);
        console.log(`Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`);
    }
}

async function updateSolarSystems() {
    const db = await connectToDatabase();
    const results = await db?.all(`
        SELECT
        mapSolarSystems.regionID AS region_id,
        mapSolarSystems.constellationID AS constellation_id,
        mapSolarSystems.solarSystemID AS system_id,
        mapSolarSystems.solarSystemName AS system_name,
        mapSolarSystems.x AS x,
        mapSolarSystems.y AS y,
        mapSolarSystems.z AS z,
        mapSolarSystems.xMin AS x_min,
        mapSolarSystems.xMax AS x_max,
        mapSolarSystems.yMin AS y_min,
        mapSolarSystems.yMax AS y_max,
        mapSolarSystems.zMin AS z_min,
        mapSolarSystems.zMax AS z_max,
        mapSolarSystems.luminosity AS luminosity,
        mapSolarSystems.border AS border,
        mapSolarSystems.fringe AS fringe,
        mapSolarSystems.corridor AS corridor,
        mapSolarSystems.hub AS hub,
        mapSolarSystems.international AS international,
        mapSolarSystems.regional AS regional,
        mapSolarSystems.constellation AS constellation,
        mapSolarSystems.security AS security,
        mapSolarSystems.factionID AS faction_id,
        mapSolarSystems.radius AS radius,
        mapSolarSystems.sunTypeID AS sun_type_id,
        mapSolarSystems.securityClass AS security_class
        FROM mapSolarSystems
    `);

    console.log(`Found ${results.length} SolarSystems`);

    const bulkOps = results.map((result) => ({
        updateOne: {
            filter: { system_id: result.system_id },
            update: { $set: result },
            upsert: true,
        },
    }));

    if (bulkOps.length > 0) {
        const response = await SolarSystems.bulkWrite(bulkOps);
        console.log(`Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`);
    }
}


async function updateRegions() {
    const db = await connectToDatabase();
    const results = await db?.all(`
        SELECT
        mapRegions.regionID AS region_id,
        mapRegions.regionName AS region_name,
        mapRegions.x AS x,
        mapRegions.y AS y,
        mapRegions.z AS z,
        mapRegions.xMin AS x_min,
        mapRegions.xMax AS x_max,
        mapRegions.yMin AS y_min,
        mapRegions.yMax AS y_max,
        mapRegions.zMin AS z_min,
        mapRegions.zMax AS z_max,
        mapRegions.factionID AS faction_id,
        mapRegions.nebula AS nebula,
        mapRegions.radius AS radius
        FROM mapRegions
    `);

    console.log(`Found ${results.length} Regions`);

    const bulkOps = results.map((result) => ({
        updateOne: {
            filter: { region_id: result.region_id },
            update: { $set: result },
            upsert: true,
        },
    }));

    if (bulkOps.length > 0) {
        const response = await Regions.bulkWrite(bulkOps);
        console.log(`Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`);
    }
}

async function updateConstellations() {
    const db = await connectToDatabase();
    const results = await db?.all(`
        SELECT
        mapConstellations.regionID AS region_id,
        mapConstellations.constellationID AS constellation_id,
        mapConstellations.constellationName AS constellation_name,
        mapConstellations.x AS x,
        mapConstellations.y AS y,
        mapConstellations.z AS z,
        mapConstellations.xMin AS x_min,
        mapConstellations.xMax AS x_max,
        mapConstellations.yMin AS y_min,
        mapConstellations.yMax AS y_max,
        mapConstellations.zMin AS z_min,
        mapConstellations.zMax AS z_max,
        mapConstellations.factionID AS faction_id,
        mapConstellations.radius AS radius
        FROM mapConstellations
    `);

    console.log(`Found ${results.length} Constellations`);

    const bulkOps = results.map((result) => ({
        updateOne: {
            filter: { constellation_id: result.constellation_id },
            update: { $set: result },
            upsert: true,
        },
    }));

    if (bulkOps.length > 0) {
        const response = await Constellations.bulkWrite(bulkOps);
        console.log(`Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`);
    }
}

async function connectToDatabase() {
    try {
        const db = await open({
            filename: "/tmp/sqlite-latest.sqlite",
            driver: sqlite3.Database
        });

        return db;
    } catch (error) {
        console.error("Error connecting to the database:", error);
    }
}
