import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import prisma from "../lib/prisma";
import { cliLogger } from "../server/helpers/Logger";
const bz2 = require("unbzip2-stream");

const pipe = promisify(pipeline);

export default {
    name: "update:sde",
    description: "Update the EVE-Online SDE",
    longRunning: false,
    run: async () => {
        cliLogger.info("Updating SDE");
        const sqliteUrl =
            "https://www.fuzzwork.co.uk/dump/sqlite-latest.sqlite.bz2";
        const sqliteMd5Url =
            "https://www.fuzzwork.co.uk/dump/sqlite-latest.sqlite.bz2.md5";
        const everefUrl =
            "https://data.everef.net/reference-data/reference-data-latest.tar.xz";
        const localDbPath = "/tmp/sqlite-latest.sqlite";

        try {
            // Fetch remote MD5
            const remoteMd5Response = await fetch(sqliteMd5Url);
            const remoteMd5Text = await remoteMd5Response.text();
            const [checksum] = remoteMd5Text.split(" ");

            // Fetch local MD5 from Config
            const localMd5Config = await prisma.config.findUnique({
                where: { key: "sde:sqlite:md5" },
            });
            const localMd5 = localMd5Config ? localMd5Config.value : null;

            // if (localMd5 === checksum) {
            //     cliLogger.info("SDE is up to date");
            //     return { result: "SDE is up to date" };
            // }

            // // Download and decompress the .bz2 file
            // const response = await fetch(sqliteUrl);
            // if (!response.ok) {
            //     throw new Error(`Failed to fetch ${sqliteUrl}`);
            // }

            // if (!response.body) {
            //     throw new Error("Response body is null");
            // }

            // cliLogger.info("Downloading SDE...");
            // const writeStream = fs.createWriteStream(localDbPath);

            // // Convert the Web ReadableStream to a Node.js ReadableStream
            // const nodeStream = Readable.fromWeb(response.body);

            // // Use the pipeline to handle the stream
            // await pipe(nodeStream, bz2(), writeStream);

            // // Download and extract the everef data
            // cliLogger.info("Downloading everef data...");
            // const everefResponse = await fetch(everefUrl);
            // if (!everefResponse.ok) {
            //     throw new Error(`Failed to fetch ${everefUrl}`);
            // }

            // if (!everefResponse.body) {
            //     throw new Error("Everef response body is null");
            // }

            // const everefWriteStream = fs.createWriteStream(
            //     "/tmp/everef-latest.tar.xz"
            // );
            // const everefNodeStream = Readable.fromWeb(everefResponse.body);
            // await pipe(everefNodeStream, everefWriteStream);

            // cliLogger.info("Extracting everef data...");
            // await new Promise<void>((resolve, reject) => {
            //     const tar = exec(
            //         "tar -xf /tmp/everef-latest.tar.xz -C /tmp",
            //         (error, stdout, stderr) => {
            //             if (error) {
            //                 cliLogger.error(
            //                     `Error extracting everef data: ${error.message}`
            //                 );
            //                 return reject(error);
            //             }
            //             if (stderr) {
            //                 cliLogger.error(
            //                     `Error extracting everef data: ${stderr}`
            //                 );
            //                 return reject(new Error(stderr));
            //             }
            //             cliLogger.info(`everef data extracted: ${stdout}`);
            //         }
            //     );
            //     tar.on("close", () => {
            //         cliLogger.info("everef data extraction complete");
            //         resolve();
            //     });
            // });

            // Process in dependency order using upserts (no need to clear data)

            // 1. Independent tables first
            await updateInvFlags();
            await updateInvGroups();
            await updateRaces();
            await updateFactions();
            await updateInvTypes();
            await updateRegions();

            // 2. Tables that depend on regions
            await updateConstellations();

            // 3. Tables that depend on constellations and regions
            await updateSolarSystems();

            // 4. Tables that depend on solar systems
            await updateCelestials();

            // 5. Tables that depend on races
            await updateBloodlines();

            // Update the local MD5 checksum
            await prisma.config.upsert({
                where: { key: "sde:sqlite:md5" },
                update: { value: checksum },
                create: { key: "sde:sqlite:md5", value: checksum },
            });

            cliLogger.info("SDE updated successfully.");
            return { result: "SDE updated successfully" };
        } catch (error) {
            cliLogger.error(`SDE update failed: ${error}`);
            throw error;
        } finally {
            await prisma.$disconnect();
        }
    },
};

async function updateInvTypes() {
    // Use everef for invTypes
    const filePath = "/tmp/types.json";
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);
    const types = Array.isArray(parsed) ? parsed : Object.values(parsed);

    cliLogger.info(`Found ${types.length} invTypes`);

    // Prepare batch data
    const batchData = types.map((result: any) => ({
        type_id: result.type_id,
        group_id: result.group_id || null,
        category_id: result.category_id || null,
        name: result.name || {},
        description: result.description || {},
        mass: result.mass ? parseFloat(result.mass) : null,
        volume: result.volume ? parseFloat(result.volume) : null,
        capacity: result.capacity ? parseFloat(result.capacity) : null,
        portion_size: result.portion_size || null,
        packaged_volume: result.packaged_volume
            ? parseFloat(result.packaged_volume)
            : null,
        radius: result.radius ? parseFloat(result.radius) : null,
        race_id: result.race_id || null,
        faction_id: result.faction_id || null,
        base_price: result.base_price ? parseFloat(result.base_price) : null,
        published: Boolean(result.published),
        market_group_id: result.market_group_id || null,
        icon_id: result.icon_id || null,
        sound_id: result.sound_id || null,
        graphic_id: result.graphic_id || null,
        masteries: result.masteries || null,
        meta_group_id: result.meta_group_id || null,
        sof_faction_name: result.sof_faction_name || null,
        traits: result.traits || null,
    }));

    // Process in batches of 1000
    const batchSize = 1000;
    let processed = 0;

    for (let i = 0; i < batchData.length; i += batchSize) {
        const batch = batchData.slice(i, i + batchSize);
        try {
            await prisma.invType.createMany({
                data: batch,
                skipDuplicates: true,
            });
            processed += batch.length;
            cliLogger.info(
                `InvTypes processed: ${processed}/${batchData.length}`
            );
        } catch (error) {
            cliLogger.error(
                `Error processing InvTypes batch ${i}-${
                    i + batchSize
                }: ${error}`
            );
        }
    }

    cliLogger.info(`InvTypes complete. Created: ${processed}`);
}

async function updateFactions() {
    const db = await connectToDatabase();
    const results = db
        .query(
            `
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
    `
        )
        .all();

    cliLogger.info(`Found ${results.length} Factions`);

    // Prepare batch data
    const batchData = (results as any[]).map((result) => ({
        faction_id: result.faction_id,
        name: result.name || "",
        description: result.description || null,
        race_ids: result.race_ids ? result.race_ids.toString() : null,
        solar_system_id: result.solar_system_id || null,
        corporation_id: result.corporation_id || null,
        size_factor: result.size_factor ? parseFloat(result.size_factor) : null,
        station_count: result.station_count || null,
        station_system_count: result.station_system_count || null,
        militia_corporation_id: result.militia_corporation_id || null,
        icon_id: result.icon_id || null,
    }));

    // Process in batches of 1000
    const batchSize = 1000;
    let processed = 0;

    for (let i = 0; i < batchData.length; i += batchSize) {
        const batch = batchData.slice(i, i + batchSize);
        try {
            await prisma.faction.createMany({
                data: batch,
                skipDuplicates: true,
            });
            processed += batch.length;
            cliLogger.info(
                `Factions processed: ${processed}/${batchData.length}`
            );
        } catch (error) {
            cliLogger.error(
                `Error processing Factions batch ${i}-${
                    i + batchSize
                }: ${error}`
            );
        }
    }

    cliLogger.info(`Factions complete. Created: ${processed}`);
}

async function updateInvFlags() {
    const db = await connectToDatabase();
    const results = db
        .query(
            `
        SELECT
        invFlags.flagID AS flag_id,
        invFlags.flagName AS flag_name,
        invFlags.flagText AS flag_text,
        invFlags.orderID AS order_id
        FROM invFlags
    `
        )
        .all();

    cliLogger.info(`Found ${results.length} invFlags`);

    // Process in batches of 100 for upserts
    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize) as any[];

        try {
            await prisma.$transaction(
                batch.map((result) =>
                    prisma.invFlag.upsert({
                        where: { flag_id: result.flag_id },
                        update: {
                            flag_name: result.flag_name || "",
                            flag_text: result.flag_text || "",
                            order_id: result.order_id || null,
                        },
                        create: {
                            flag_id: result.flag_id,
                            flag_name: result.flag_name || "",
                            flag_text: result.flag_text || "",
                            order_id: result.order_id || null,
                        },
                    })
                )
            );
            processed += batch.length;
            cliLogger.info(
                `InvFlags processed: ${processed}/${results.length}`
            );
        } catch (error) {
            cliLogger.error(
                `Error processing InvFlags batch ${i}-${
                    i + batchSize
                }: ${error}`
            );
        }
    }

    cliLogger.info(`InvFlags complete. Processed: ${processed}`);
}

async function updateInvGroups() {
    const filePath = "/tmp/groups.json";
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);
    const groups = Array.isArray(parsed) ? parsed : Object.values(parsed);

    cliLogger.info(`Found ${groups.length} invGroups`);

    // Prepare batch data
    const batchData = (groups as any[]).map((result) => ({
        group_id: result.group_id,
        category_id: result.category_id || null,
        group_name: result.group_name || "",
        icon_id: result.icon_id || null,
        use_base_price: Boolean(result.use_base_price),
        anchored: Boolean(result.anchored),
        anchorable: Boolean(result.anchorable),
        fittable_non_singleton: Boolean(result.fittable_non_singleton),
        published: Boolean(result.published),
    }));

    // Process in batches of 1000
    const batchSize = 1000;
    let processed = 0;

    for (let i = 0; i < batchData.length; i += batchSize) {
        const batch = batchData.slice(i, i + batchSize);
        try {
            await prisma.invGroup.createMany({
                data: batch,
                skipDuplicates: true,
            });
            processed += batch.length;
            cliLogger.info(
                `InvGroups processed: ${processed}/${batchData.length}`
            );
        } catch (error) {
            cliLogger.error(
                `Error processing InvGroups batch ${i}-${
                    i + batchSize
                }: ${error}`
            );
        }
    }

    cliLogger.info(`InvGroups complete. Created: ${processed}`);
}

async function updateCelestials() {
    const db = await connectToDatabase();

    const results = db
        .query(
            `
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
    `
        )
        .all();

    cliLogger.info(`Found ${results.length} Celestials`);

    // Prepare batch data
    const batchData = (results as any[]).map((result) => ({
        item_id: result.item_id,
        constellation_id: result.constellation_id,
        item_name: result.item_name || "",
        orbit_id: result.orbit_id || null,
        region_id: result.region_id,
        region_name: result.region_name || "",
        solar_system_id: result.solar_system_id,
        solar_system_name: result.solar_system_name || "",
        type_id: result.type_id,
        type_name: result.type_name || "",
        x: result.x ? parseFloat(result.x) : null,
        y: result.y ? parseFloat(result.y) : null,
        z: result.z ? parseFloat(result.z) : null,
    }));

    // Process in batches of 1000
    const batchSize = 1000;
    let processed = 0;

    for (let i = 0; i < batchData.length; i += batchSize) {
        const batch = batchData.slice(i, i + batchSize);
        try {
            await prisma.celestial.createMany({
                data: batch,
                skipDuplicates: true,
            });
            processed += batch.length;
            cliLogger.info(
                `Celestials processed: ${processed}/${batchData.length}`
            );
        } catch (error) {
            cliLogger.error(
                `Error processing Celestials batch ${i}-${
                    i + batchSize
                }: ${error}`
            );
        }
    }

    cliLogger.info(`Celestials complete. Created: ${processed}`);
}

async function updateSolarSystems() {
    const db = await connectToDatabase();
    const results = db
        .query(
            `
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
        mapSolarSystems.constellation AS is_constellation,
        mapSolarSystems.security AS security,
        mapSolarSystems.factionID AS faction_id,
        mapSolarSystems.radius AS radius,
        mapSolarSystems.sunTypeID AS sun_type_id,
        mapSolarSystems.securityClass AS security_class
        FROM mapSolarSystems
    `
        )
        .all();

    cliLogger.info(`Found ${results.length} SolarSystems`);

    // Prepare batch data
    const batchData = (results as any[]).map((result) => ({
        system_id: result.system_id,
        region_id: result.region_id,
        constellation_id: result.constellation_id,
        system_name: result.system_name || "",
        x: result.x ? parseFloat(result.x) : null,
        y: result.y ? parseFloat(result.y) : null,
        z: result.z ? parseFloat(result.z) : null,
        x_min: result.x_min ? parseFloat(result.x_min) : null,
        x_max: result.x_max ? parseFloat(result.x_max) : null,
        y_min: result.y_min ? parseFloat(result.y_min) : null,
        y_max: result.y_max ? parseFloat(result.y_max) : null,
        z_min: result.z_min ? parseFloat(result.z_min) : null,
        z_max: result.z_max ? parseFloat(result.z_max) : null,
        luminosity: result.luminosity ? parseFloat(result.luminosity) : null,
        border: Boolean(result.border),
        fringe: Boolean(result.fringe),
        corridor: Boolean(result.corridor),
        hub: Boolean(result.hub),
        international: Boolean(result.international),
        regional: Boolean(result.regional),
        is_constellation: Boolean(result.is_constellation),
        security: result.security ? parseFloat(result.security) : null,
        faction_id: result.faction_id || null,
        radius: result.radius ? parseFloat(result.radius) : null,
        sun_type_id: result.sun_type_id || null,
        security_class: result.security_class || null,
    }));

    // Process in batches of 1000
    const batchSize = 1000;
    let processed = 0;

    for (let i = 0; i < batchData.length; i += batchSize) {
        const batch = batchData.slice(i, i + batchSize);
        try {
            await prisma.solarSystem.createMany({
                data: batch,
                skipDuplicates: true,
            });
            processed += batch.length;
            cliLogger.info(
                `SolarSystems processed: ${processed}/${batchData.length}`
            );
        } catch (error) {
            cliLogger.error(
                `Error processing SolarSystems batch ${i}-${
                    i + batchSize
                }: ${error}`
            );
        }
    }

    cliLogger.info(`SolarSystems complete. Created: ${processed}`);
}

async function updateRegions() {
    const filePath = "/tmp/regions.json";
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);
    const regions = Array.isArray(parsed) ? parsed : Object.values(parsed);

    cliLogger.info(`Found ${regions.length} regions`);

    // Prepare batch data
    const batchData = (regions as any[]).map((result) => ({
        region_id: result.region_id,
        region_name: result.region_name || "",
        description:
            typeof result.description === "string"
                ? result.description
                : typeof result.description === "object" &&
                  result.description?.en
                ? result.description.en
                : null,
        x: result.x ? parseFloat(result.x) : null,
        y: result.y ? parseFloat(result.y) : null,
        z: result.z ? parseFloat(result.z) : null,
        x_min: result.x_min ? parseFloat(result.x_min) : null,
        x_max: result.x_max ? parseFloat(result.x_max) : null,
        y_min: result.y_min ? parseFloat(result.y_min) : null,
        y_max: result.y_max ? parseFloat(result.y_max) : null,
        z_min: result.z_min ? parseFloat(result.z_min) : null,
        z_max: result.z_max ? parseFloat(result.z_max) : null,
        faction_id: result.faction_id || null,
        nebula: result.nebula || null,
        wormhole_class_id: result.wormhole_class_id || null,
    }));

    // Process in batches of 1000
    const batchSize = 1000;
    let processed = 0;

    for (let i = 0; i < batchData.length; i += batchSize) {
        const batch = batchData.slice(i, i + batchSize);
        try {
            await prisma.region.createMany({
                data: batch,
                skipDuplicates: true,
            });
            processed += batch.length;
            cliLogger.info(
                `Regions processed: ${processed}/${batchData.length}`
            );
        } catch (error) {
            cliLogger.error(
                `Error processing Regions batch ${i}-${i + batchSize}: ${error}`
            );
        }
    }

    cliLogger.info(`Regions complete. Created: ${processed}`);
}

async function updateBloodlines() {
    const db = await connectToDatabase();
    const results = db
        .query(
            `
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
    `
        )
        .all();

    cliLogger.info(`Found ${results.length} Bloodlines`);

    // Prepare batch data
    const batchData = (results as any[]).map((result) => ({
        bloodline_id: result.bloodline_id,
        bloodline_name: result.bloodline_name || "",
        race_id: result.race_id,
        description: result.description || null,
        male_description: result.male_description || null,
        female_description: result.female_description || null,
        ship_type_id: result.ship_type_id || null,
        corporation_id: result.corporation_id || null,
        perception: result.perception || null,
        willpower: result.willpower || null,
        charisma: result.charisma || null,
        memory: result.memory || null,
        intelligence: result.intelligence || null,
        icon_id: result.icon_id || null,
        short_description: result.short_description || null,
        short_male_description: result.short_male_description || null,
        short_female_description: result.short_female_description || null,
    }));

    // Process in batches of 1000
    const batchSize = 1000;
    let processed = 0;

    for (let i = 0; i < batchData.length; i += batchSize) {
        const batch = batchData.slice(i, i + batchSize);
        try {
            await prisma.bloodline.createMany({
                data: batch,
                skipDuplicates: true,
            });
            processed += batch.length;
            cliLogger.info(
                `Bloodlines processed: ${processed}/${batchData.length}`
            );
        } catch (error) {
            cliLogger.error(
                `Error processing Bloodlines batch ${i}-${
                    i + batchSize
                }: ${error}`
            );
        }
    }

    cliLogger.info(`Bloodlines complete. Created: ${processed}`);
}

async function updateRaces() {
    const db = await connectToDatabase();
    const results = db
        .query(
            `
        SELECT
        chrRaces.raceID AS race_id,
        chrRaces.raceName AS race_name,
        chrRaces.description AS description,
        chrRaces.iconID AS icon_id,
        chrRaces.shortDescription AS short_description
        FROM chrRaces
    `
        )
        .all();

    cliLogger.info(`Found ${results.length} Races`);

    // Process in batches of 100 for upserts
    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize) as any[];

        try {
            await prisma.$transaction(
                batch.map((result) =>
                    prisma.race.upsert({
                        where: { race_id: result.race_id },
                        update: {
                            race_name: result.race_name || "",
                            description: result.description || null,
                            icon_id: result.icon_id || null,
                            short_description: result.short_description || null,
                        },
                        create: {
                            race_id: result.race_id,
                            race_name: result.race_name || "",
                            description: result.description || null,
                            icon_id: result.icon_id || null,
                            short_description: result.short_description || null,
                        },
                    })
                )
            );
            processed += batch.length;
            cliLogger.info(`Races processed: ${processed}/${results.length}`);
        } catch (error) {
            cliLogger.error(
                `Error processing Races batch ${i}-${i + batchSize}: ${error}`
            );
        }
    }

    cliLogger.info(`Races complete. Created: ${processed}`);
}

async function updateConstellations() {
    const db = await connectToDatabase();
    const results = db
        .query(
            `
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
    `
        )
        .all();

    cliLogger.info(`Found ${results.length} Constellations`);

    // Prepare batch data
    const batchData = (results as any[]).map((result) => ({
        region_id: result.region_id,
        constellation_id: result.constellation_id,
        constellation_name: result.constellation_name || "",
        x: result.x ? parseFloat(result.x) : null,
        y: result.y ? parseFloat(result.y) : null,
        z: result.z ? parseFloat(result.z) : null,
        x_min: result.x_min ? parseFloat(result.x_min) : null,
        x_max: result.x_max ? parseFloat(result.x_max) : null,
        y_min: result.y_min ? parseFloat(result.y_min) : null,
        y_max: result.y_max ? parseFloat(result.y_max) : null,
        z_min: result.z_min ? parseFloat(result.z_min) : null,
        z_max: result.z_max ? parseFloat(result.z_max) : null,
        faction_id: result.faction_id || null,
        radius: result.radius ? parseFloat(result.radius) : null,
    }));

    // Process in batches of 1000
    const batchSize = 1000;
    let processed = 0;

    for (let i = 0; i < batchData.length; i += batchSize) {
        const batch = batchData.slice(i, i + batchSize);
        try {
            await prisma.constellation.createMany({
                data: batch,
                skipDuplicates: true,
            });
            processed += batch.length;
            cliLogger.info(
                `Constellations processed: ${processed}/${batchData.length}`
            );
        } catch (error) {
            cliLogger.error(
                `Error processing Constellations batch ${i}-${
                    i + batchSize
                }: ${error}`
            );
        }
    }

    cliLogger.info(`Constellations complete. Created: ${processed}`);
}

async function connectToDatabase() {
    try {
        // Use Bun's built-in SQLite Database
        const db = new Database("/tmp/sqlite-latest.sqlite", {
            readonly: true,
        });
        return db;
    } catch (error) {
        console.error("Error connecting to the database:", error);
        throw error;
    }
}
