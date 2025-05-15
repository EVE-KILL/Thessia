import { Database } from "bun:sqlite";
import { exec } from "node:child_process";
import fs from "node:fs";
import { Readable, pipeline } from "node:stream";
import { promisify } from "node:util";
import bz2 from "unbzip2-stream";
// Import Models
import { Bloodlines } from "~/server/models/Bloodlines";
import { Celestials } from "~/server/models/Celestials";
import { Config } from "~/server/models/Config";
import { Constellations } from "~/server/models/Constellations";
import { Factions } from "~/server/models/Factions";
import { InvFlags } from "~/server/models/InvFlags";
import { InvGroups } from "~/server/models/InvGroups";
import { InvTypes } from "~/server/models/InvTypes";
import { Races } from "~/server/models/Races";
import { Regions } from "~/server/models/Regions";
import { SolarSystems } from "~/server/models/SolarSystems";

const pipe = promisify(pipeline);

export default {
    name: "update:sde",
    description: "Update the EVE-Online SDE",
    longRunning: false,
    run: async () => {
        console.log("Updating SDE");
        const sqliteUrl = "https://www.fuzzwork.co.uk/dump/sqlite-latest.sqlite.bz2";
        const sqliteMd5Url = "https://www.fuzzwork.co.uk/dump/sqlite-latest.sqlite.bz2.md5";
        const everefUrl = "https://data.everef.net/reference-data/reference-data-latest.tar.xz";
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

        // Download and extract the everef data
        console.log("Downloading everef data...");
        const everefResponse = await fetch(everefUrl);
        if (!everefResponse.ok) {
            throw new Error(`Failed to fetch ${everefUrl}`);
        }
        const everefWriteStream = fs.createWriteStream("/tmp/everef-latest.tar.xz");
        const everefNodeStream = Readable.fromWeb(everefResponse.body);
        await pipe(everefNodeStream, everefWriteStream);
        console.log("Extracting everef data...");
        await new Promise<void>((resolve, reject) => {
            const tar = exec("tar -xf /tmp/everef-latest.tar.xz -C /tmp", (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error extracting everef data: ${error.message}`);
                    return reject(error);
                }
                if (stderr) {
                    console.error(`Error extracting everef data: ${stderr}`);
                    return reject(new Error(stderr));
                }
                console.log(`everef data extracted: ${stdout}`);
            });
            tar.on("close", () => {
                console.log("everef data extraction complete");
                resolve();
            });
        });

        await updateCelestials();
        await updateSolarSystems();
        await updateRegions();
        await updateConstellations();
        await invTypes();
        await factions();
        await invFlags();
        await invGroups();
        await updateBloodlines();
        await updateRaces();

        // Update the local MD5 checksum
        await Config.updateOne({ key: "sde:sqlite:md5" }, { value: checksum }, { upsert: true });

        console.log("SDE updated successfully.");
        return { result: "SDE updated successfully" };
    },
};

async function invTypes() {
    // Use everef for invTypes
    const filePath = "/tmp/types.json";
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);
    const types = Array.isArray(parsed) ? parsed : Object.values(parsed);

    console.log(`Found ${types.length} invTypes`);
    const bulkOps = [];

    for (const result of types) {
        bulkOps.push({
            updateOne: {
                filter: { type_id: result.type_id },
                update: { $set: result },
                upsert: true,
            },
        });
    }

    if (bulkOps.length > 0) {
        const response = await InvTypes.bulkWrite(bulkOps);
        console.log(
            `Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`,
        );
    }
}

async function factions() {
    const db = await connectToDatabase();
    const results = db
        .query(`
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
    `)
        .all();

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
        console.log(
            `Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`,
        );
    }
}

async function invFlags() {
    const db = await connectToDatabase();
    const results = db
        .query(`
        SELECT
        invFlags.flagID AS flag_id,
        invFlags.flagName AS flag_name,
        invFlags.flagText AS flag_text,
        invFlags.orderID AS order_id
        FROM invFlags
    `)
        .all();

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
        console.log(
            `Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`,
        );
    }
}

async function invGroups() {
    // Use everef for invTypes
    const filePath = "/tmp/groups.json";
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);
    const groups = Array.isArray(parsed) ? parsed : Object.values(parsed);

    console.log(`Found ${groups.length} invGroups`);
    const bulkOps = [];

    for (const result of groups) {
        bulkOps.push({
            updateOne: {
                filter: { group_id: result.group_id },
                update: { $set: result },
                upsert: true,
            },
        });
    }

    if (bulkOps.length > 0) {
        const response = await InvGroups.bulkWrite(bulkOps);
        console.log(
            `Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`,
        );
    }
}

async function updateCelestials() {
    const db = await connectToDatabase();

    const results = db
        .query(`
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
    `)
        .all();

    // Emit the count of found results
    console.log(`Found ${results.length} Celestials`);

    // Prepare bulk operations
    const bulkOps = results.map((result) => ({
        updateOne: {
            filter: { item_id: result.item_id }, // Match document by item_id
            update: { $set: result }, // Set the fields from the result
            upsert: true, // Insert if not found
        },
    }));

    // Perform bulk operation
    if (bulkOps.length > 0) {
        const response = await Celestials.bulkWrite(bulkOps);
        console.log(
            `Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`,
        );
    }
}

async function updateSolarSystems() {
    const db = await connectToDatabase();
    const results = db
        .query(`
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
    `)
        .all();

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
        console.log(
            `Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`,
        );
    }
}

async function updateRegions() {
    // Use everef for invTypes
    const filePath = "/tmp/regions.json";
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);
    const regions = Array.isArray(parsed) ? parsed : Object.values(parsed);

    console.log(`Found ${regions.length} regions`);
    const bulkOps = [];

    for (const result of regions) {
        bulkOps.push({
            updateOne: {
                filter: { region_id: result.region_id },
                update: { $set: result },
                upsert: true,
            },
        });
    }

    if (bulkOps.length > 0) {
        const response = await Regions.bulkWrite(bulkOps);
        console.log(
            `Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`,
        );
    }
}

async function updateBloodlines() {
    const db = await connectToDatabase();
    const results = db.query(`
        SELECT
        chrBloodlines.bloodlineID AS bloodline_id,
        chrBloodlines.bloodlineName AS bloodline_name,
        chrBloodlines.raceID AS race_id,
        chrBloodlines.description AS description,
        chrBloodlines.maleDescription AS male_description,
        chrBloodlines.femaleDescription AS female_description,
        chrBloodlines.shipTypeID AS ship_type_id,
        chrBloodlines.corporationID AS corporation_id,
        chrBloodlines.perception AS perception,
        chrBloodlines.willpower AS willpower,
        chrBloodlines.charisma AS charisma,
        chrBloodlines.memory AS memory,
        chrBloodlines.intelligence AS intelligence,
        chrBloodlines.iconID AS icon_id,
        chrBloodlines.shortDescription AS short_description,
        chrBloodlines.shortMaleDescription AS short_male_description,
        chrBloodlines.shortFemaleDescription AS short_female_description
        FROM chrBloodlines
    `).all();

    console.log(`Found ${results.length} Bloodlines`);

    const bulkOps = results.map((result) => ({
        updateOne: {
            filter: { bloodline_id: result.bloodline_id },
            update: { $set: result },
            upsert: true,
        },
    }));

    if (bulkOps.length > 0) {
        const response = await Bloodlines.bulkWrite(bulkOps);
        console.log(
            `Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`,
        );
    }
}

async function updateRaces() {
    const db = await connectToDatabase();
    const results = db.query(`
        SELECT
        chrRaces.raceID AS race_id,
        chrRaces.raceName AS race_name,
        chrRaces.description AS description,
        chrRaces.iconID AS icon_id,
        chrRaces.shortDescription AS short_description
        FROM chrRaces
    `).all();

    console.log(`Found ${results.length} Races`);

    const bulkOps = results.map((result) => ({
        updateOne: {
            filter: { race_id: result.race_id },
            update: { $set: result },
            upsert: true,
        },
    }));

    if (bulkOps.length > 0) {
        const response = await Races.bulkWrite(bulkOps);
        console.log(
            `Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`,
        );
    }
}

async function updateConstellations() {
    const db = await connectToDatabase();
    const results = db
        .query(`
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
    `)
        .all();

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
        console.log(
            `Bulk operation complete. Matched: ${response.matchedCount}, Modified: ${response.modifiedCount}, Upserts: ${response.upsertedCount}`,
        );
    }
}

async function connectToDatabase() {
    try {
        // Use Bun's built-in SQLite Database
        const db = new Database("/tmp/sqlite-latest.sqlite", { readonly: true });
        return db;
    } catch (error) {
        console.error("Error connecting to the database:", error);
        throw error;
    }
}
