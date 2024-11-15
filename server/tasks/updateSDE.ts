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
        await invTypes();
        await factions();
        await invFlags();

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
    let results = await db.all(`
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

    // Emit the count of found results
    console.log(`Found ${results.length} invTypes`);
    for (let result of results) {
        await InvTypes.updateOne(
            { type_id: result.type_id },
            result,
            { upsert: true }
        );
    }
}

async function factions() {
    const db = await connectToDatabase();
    let results = await db.all(`
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

    // Emit the count of found results
    console.log(`Found ${results.length} factions`);
    for (let result of results) {
        await Factions.updateOne(
            { faction_id: result.faction_id },
            result,
            { upsert: true }
        );
    }
}

async function invFlags() {
    const db = await connectToDatabase();
    let results = await db.all(`
        SELECT
        invFlags.flagID AS flag_id,
        invFlags.flagName AS flag_name,
        invFlags.flagText AS flag_text,
        invFlags.orderID AS order_id
        FROM invFlags
    `);

    // Emit the count of found results
    console.log(`Found ${results.length} invFlags`);
    for (let result of results) {
        await InvFlags.updateOne(
            { flag_id: result.flag_id },
            result,
            { upsert: true }
        );
    }
}

async function updateCelestials() {
    const db = await connectToDatabase();

    let results = await db.all(`
        SELECT
            mapDenormalize.itemID AS item_id,
            mapDenormalize.itemName AS item_name,
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
            JOIN mapSolarSystems ON mapSolarSystems.solarSystemID = mapDenormalize.solarSystemID
            JOIN mapRegions ON mapDenormalize.regionID = mapRegions.regionID
            JOIN mapConstellations ON mapDenormalize.constellationID = mapConstellations.constellationID
    `);

    // Emit the count of found results
    console.log(`Found ${results.length} Celestials`);
    for (let result of results) {
        await Celestials.updateOne(
            { item_id: result.item_id },
            result,
            { upsert: true }
        );
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
