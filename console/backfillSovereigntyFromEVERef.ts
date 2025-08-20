import { exec } from "child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "util";
import { cliLogger } from "../server/helpers/Logger";
import {
    getCachedAlliance,
    getCachedCorporation,
} from "../server/helpers/RuntimeCache";
import { Sovereignty } from "../server/models/Sovereignty";

const execAsync = promisify(exec);

export default {
    name: "backfill:sovereignty_everef",
    description: "Backfill historical sovereignty data from EVERef",
    longRunning: true,
    options: [
        {
            flags: "-s, --start-date <date>",
            description:
                "Start processing from this date (YYYY-MM-DD format). Will skip any data before this date.",
            defaultValue: null,
        },
        {
            flags: "-e, --end-date <date>",
            description:
                "Stop processing at this date (YYYY-MM-DD format). Will not process data after this date.",
            defaultValue: null,
        },
    ],
    examples: [
        "bin/console backfill:sovereignty_everef                           # Process all available data",
        'bin/console backfill:sovereignty_everef -s "2023-01-01"          # Start from January 1, 2023',
        'bin/console backfill:sovereignty_everef -s "2022-12-16" -e "2023-12-31" # Process only 2023 data',
    ],
    run: async (args: string[] = [], cmdOptions: any = {}) => {
        cliLogger.info("Starting sovereignty backfill from EVERef...");

        // Parse date options
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (cmdOptions.startDate) {
            startDate = new Date(cmdOptions.startDate);
            if (isNaN(startDate.getTime())) {
                throw new Error(
                    `Invalid start date format: ${cmdOptions.startDate}. Use YYYY-MM-DD format.`
                );
            }
            cliLogger.info(
                `Starting from date: ${startDate.toISOString().split("T")[0]}`
            );
        }

        if (cmdOptions.endDate) {
            endDate = new Date(cmdOptions.endDate);
            if (isNaN(endDate.getTime())) {
                throw new Error(
                    `Invalid end date format: ${cmdOptions.endDate}. Use YYYY-MM-DD format.`
                );
            }
            // Set end date to end of day
            endDate.setHours(23, 59, 59, 999);
            cliLogger.info(
                `Ending at date: ${endDate.toISOString().split("T")[0]}`
            );
        }

        if (startDate && endDate && startDate > endDate) {
            throw new Error("Start date cannot be after end date");
        }

        const baseUrl = "https://data.everef.net/sovereignty-map/history/";
        const tmpDir = "/tmp/everef_sovereignty";

        // Ensure temp directory exists
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        try {
            // Process yearly archives first (2017-2019, 2021-2022) - 2020 doesn't exist
            const yearlyFiles = [
                { file: "sovereignty-map-2017.tar.bz2", year: 2017 },
                { file: "sovereignty-map-2018.tar.bz2", year: 2018 },
                { file: "sovereignty-map-2019.tar.bz2", year: 2019 },
                { file: "sovereignty-map-2021.tar.bz2", year: 2021 },
                { file: "sovereignty-map-2022.tar.bz2", year: 2022 },
            ];

            for (const { file: fileName, year } of yearlyFiles) {
                // Skip entire year if it's before our start date
                if (startDate && year < startDate.getFullYear()) {
                    cliLogger.info(
                        `Skipping ${fileName} - year ${year} is before start date`
                    );
                    continue;
                }

                // Skip entire year if it's after our end date
                if (endDate && year > endDate.getFullYear()) {
                    cliLogger.info(
                        `Skipping ${fileName} - year ${year} is after end date`
                    );
                    continue;
                }

                await processYearlyFile(
                    baseUrl,
                    fileName,
                    tmpDir,
                    startDate,
                    endDate
                );
            }

            // Process daily files for 2022 (starting from 2022-12-16), 2023, 2024, 2025
            await processDailyFiles(baseUrl, tmpDir, startDate, endDate);

            cliLogger.info("Sovereignty backfill completed successfully!");
        } catch (error) {
            cliLogger.error(
                `Sovereignty backfill failed: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            throw error;
        } finally {
            // Clean up temp directory
            try {
                fs.rmSync(tmpDir, { recursive: true, force: true });
                cliLogger.info("Cleaned up temporary files");
            } catch (error) {
                cliLogger.warn(
                    `Failed to clean up temporary files: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }
        }
    },
};

async function processYearlyFile(
    baseUrl: string,
    fileName: string,
    tmpDir: string,
    startDate: Date | null = null,
    endDate: Date | null = null
): Promise<void> {
    cliLogger.info(`Processing yearly file: ${fileName}`);

    const url = `${baseUrl}${fileName}`;
    const filePath = path.join(tmpDir, fileName);
    const extractDir = path.join(tmpDir, fileName.replace(".tar.bz2", ""));

    try {
        // Download the file
        cliLogger.info(`Downloading ${url}...`);
        await execAsync(`curl -L -o "${filePath}" "${url}"`);

        // Extract the archive
        cliLogger.info(`Extracting ${fileName}...`);
        fs.mkdirSync(extractDir, { recursive: true });
        await execAsync(`tar -xjf "${filePath}" -C "${extractDir}"`);

        // Process all JSON files in the extracted directory
        await processJsonFiles(extractDir, startDate, endDate);

        // Clean up this year's files
        fs.rmSync(extractDir, { recursive: true });
        fs.unlinkSync(filePath);

        cliLogger.info(`Completed processing ${fileName}`);
    } catch (error) {
        cliLogger.error(
            `Failed to process ${fileName}: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
        throw error;
    }
}

async function processDailyFiles(
    baseUrl: string,
    tmpDir: string,
    startDate: Date | null = null,
    endDate: Date | null = null
): Promise<void> {
    cliLogger.info("Processing daily files...");

    const dailyRanges = [
        { year: 2022, startMonth: 12, startDay: 16, endMonth: 12, endDay: 31 },
        { year: 2023, startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
        { year: 2024, startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 },
        { year: 2025, startMonth: 1, startDay: 1, endMonth: 8, endDay: 20 }, // Up to current date
    ];

    for (const range of dailyRanges) {
        // Skip entire year if it's before our start date
        if (startDate && range.year < startDate.getFullYear()) {
            cliLogger.info(
                `Skipping daily files for ${range.year} - year is before start date`
            );
            continue;
        }

        // Skip entire year if it's after our end date
        if (endDate && range.year > endDate.getFullYear()) {
            cliLogger.info(
                `Skipping daily files for ${range.year} - year is after end date`
            );
            continue;
        }

        await processDailyRange(baseUrl, tmpDir, range, startDate, endDate);
    }
}

async function processDailyRange(
    baseUrl: string,
    tmpDir: string,
    range: any,
    startDate: Date | null = null,
    endDate: Date | null = null
): Promise<void> {
    cliLogger.info(`Processing daily files for ${range.year}...`);

    for (let month = range.startMonth; month <= range.endMonth; month++) {
        const startDay = month === range.startMonth ? range.startDay : 1;
        const endDay =
            month === range.endMonth
                ? range.endDay
                : getDaysInMonth(range.year, month);

        for (let day = startDay; day <= endDay; day++) {
            const dateStr = `${range.year}-${month
                .toString()
                .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

            const currentDate = new Date(dateStr);

            // Skip if before start date or after end date
            if (startDate && currentDate < startDate) {
                continue;
            }
            if (endDate && currentDate > endDate) {
                continue;
            }

            try {
                // Get all files for this date
                const dailyFiles = await findDailyFiles(baseUrl, dateStr);
                if (dailyFiles.length > 0) {
                    cliLogger.info(
                        `Found ${dailyFiles.length} files for ${dateStr}`
                    );

                    // Process all files for this date (they represent different times of day)
                    for (const fileName of dailyFiles) {
                        await processDailyFile(
                            baseUrl,
                            fileName,
                            tmpDir,
                            dateStr,
                            startDate,
                            endDate
                        );
                    }
                } else {
                    cliLogger.warn(`No files found for date: ${dateStr}`);
                }
            } catch (error) {
                cliLogger.warn(
                    `Failed to process date ${dateStr}: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
                // Continue with next date instead of failing completely
            }
        }
    }
}

async function findDailyFiles(
    baseUrl: string,
    dateStr: string
): Promise<string[]> {
    const year = parseInt(dateStr.split("-")[0]);

    try {
        if (year >= 2023) {
            // For 2023+, files are organized in year/date/ folders
            const yearFolderUrl = `${baseUrl}${year}/${dateStr}/`;

            // Get directory listing and find all files matching the date pattern
            const { stdout } = await execAsync(
                `curl -s "${yearFolderUrl}" | grep -o 'sovereignty-map-${dateStr}_[^"]*\\.json\\.bz2' | sort`
            );
            const files = stdout
                .trim()
                .split("\n")
                .filter((f) => f.length > 0);
            return files;
        } else {
            // For 2022 and earlier, files are in the base directory
            const { stdout } = await execAsync(
                `curl -s "${baseUrl}" | grep -o 'sovereignty-map-${dateStr}_[^"]*\\.json\\.bz2' | sort`
            );
            const files = stdout
                .trim()
                .split("\n")
                .filter((f) => f.length > 0);
            return files;
        }
    } catch (error) {
        cliLogger.warn(
            `Failed to list files for ${dateStr}, trying fallback patterns`
        );

        // Fallback: try common time patterns
        const commonPatterns = [
            `sovereignty-map-${dateStr}_16-16-34.json.bz2`,
            `sovereignty-map-${dateStr}_12-00-00.json.bz2`,
            `sovereignty-map-${dateStr}_00-00-00.json.bz2`,
        ];

        const existingFiles: string[] = [];
        for (const pattern of commonPatterns) {
            try {
                // Build the correct URL based on year
                const fileUrl =
                    year >= 2023
                        ? `${baseUrl}${year}/${dateStr}/${pattern}`
                        : `${baseUrl}${pattern}`;

                // Test if the file exists with a HEAD request
                await execAsync(
                    `curl -I "${fileUrl}" 2>/dev/null | grep -q "200 OK"`
                );
                existingFiles.push(pattern);
                break; // Only need one file per day for sovereignty
            } catch {
                // File doesn't exist, continue
            }
        }

        return existingFiles;
    }
}

async function processDailyFile(
    baseUrl: string,
    fileName: string,
    tmpDir: string,
    dateStr: string,
    startDate: Date | null = null,
    endDate: Date | null = null
): Promise<void> {
    const year = parseInt(dateStr.split("-")[0]);

    // Build the correct URL based on year structure
    const url =
        year >= 2023
            ? `${baseUrl}${year}/${dateStr}/${fileName}`
            : `${baseUrl}${fileName}`;

    const filePath = path.join(tmpDir, fileName);
    const jsonPath = path.join(tmpDir, fileName.replace(".bz2", ""));

    try {
        // Download the file
        await execAsync(`curl -L -o "${filePath}" "${url}"`);

        // Extract the bz2 file
        await execAsync(`bunzip2 "${filePath}"`);

        // Process the JSON file
        if (fs.existsSync(jsonPath)) {
            await processJsonFile(jsonPath, dateStr, startDate, endDate);
            fs.unlinkSync(jsonPath);
        }
    } catch (error) {
        cliLogger.warn(
            `Failed to process daily file ${fileName}: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
}

async function processJsonFiles(
    directory: string,
    startDate: Date | null = null,
    endDate: Date | null = null
): Promise<void> {
    const files = fs.readdirSync(directory);

    // Separate JSON files from directories and sort JSON files chronologically
    const jsonFiles: { file: string; timestamp: Date }[] = [];
    const directories: string[] = [];

    for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            directories.push(file);
        } else if (file.endsWith(".json")) {
            // Extract full timestamp from filename: sovereigntymap_2017-12-22T01:00:05.json
            const timestampMatch = file.match(
                /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/
            );
            if (timestampMatch) {
                const timestamp = new Date(timestampMatch[1]);
                jsonFiles.push({ file, timestamp });
            } else {
                // Fallback to date only if full timestamp not found
                const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
                const timestamp = dateMatch
                    ? new Date(dateMatch[1])
                    : new Date(0);
                jsonFiles.push({ file, timestamp });
            }
        }
    }

    // Sort JSON files by timestamp (oldest first)
    jsonFiles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Process directories first (recursively)
    for (const dir of directories) {
        const dirPath = path.join(directory, dir);
        await processJsonFiles(dirPath, startDate, endDate);
    }

    // Process JSON files in chronological order
    for (const { file, timestamp } of jsonFiles) {
        // Skip if before start date or after end date
        if (startDate && timestamp < startDate) {
            continue;
        }
        if (endDate && timestamp > endDate) {
            continue;
        }

        const filePath = path.join(directory, file);
        const dateStr = timestamp.toISOString().split("T")[0]; // Convert to YYYY-MM-DD format
        await processJsonFile(filePath, dateStr, startDate, endDate);
    }
}

async function processJsonFile(
    filePath: string,
    dateStr: string | null,
    startDate: Date | null = null,
    endDate: Date | null = null
): Promise<void> {
    try {
        const data = fs.readFileSync(filePath, "utf8");
        const sovereigntyData = JSON.parse(data);

        if (!Array.isArray(sovereigntyData) || sovereigntyData.length === 0) {
            cliLogger.warn(`No valid sovereignty data in ${filePath}`);
            return;
        }

        cliLogger.info(
            `Processing ${
                sovereigntyData.length
            } sovereignty entries from ${path.basename(filePath)}`
        );

        // Parse date for timestamp
        let timestamp: Date;
        if (dateStr) {
            // Extract time from filename if available
            const timeMatch = path
                .basename(filePath)
                .match(/_(\d{2})-(\d{2})-(\d{2})/);
            if (timeMatch) {
                const [, hours, minutes, seconds] = timeMatch;
                timestamp = new Date(
                    `${dateStr}T${hours}:${minutes}:${seconds}.000Z`
                );
            } else {
                timestamp = new Date(`${dateStr}T12:00:00.000Z`); // Use noon UTC as default time
            }
        } else {
            // Try to extract from filename or use current time
            const fileNameMatch = path
                .basename(filePath)
                .match(/(\d{4}-\d{2}-\d{2})/);
            if (fileNameMatch) {
                timestamp = new Date(`${fileNameMatch[1]}T12:00:00.000Z`);
            } else {
                timestamp = new Date(); // Fallback to current time
            }
        }

        // Skip if timestamp is outside of our date range
        if (startDate && timestamp < startDate) {
            cliLogger.info(
                `Skipping ${path.basename(filePath)} - before start date`
            );
            return;
        }
        if (endDate && timestamp > endDate) {
            cliLogger.info(
                `Skipping ${path.basename(filePath)} - after end date`
            );
            return;
        }

        const bulkOps: any[] = [];

        // Group sovereignty data by system for processing
        const systemSovereigntyMap = new Map();

        for (const sovEntry of sovereigntyData) {
            if (!sovEntry.system_id) continue;

            // Build sovereignty entry with names resolved
            const sovereigntyInfo = {
                alliance_id: sovEntry.alliance_id || undefined,
                corporation_id: sovEntry.corporation_id || undefined,
                faction_id: sovEntry.faction_id || undefined,
                system_id: sovEntry.system_id,
                alliance_name: undefined as string | undefined,
                corporation_name: undefined as string | undefined,
            };

            // Resolve alliance and corporation names using cached lookups
            try {
                if (sovEntry.alliance_id) {
                    const allianceData = await getCachedAlliance(
                        sovEntry.alliance_id
                    );
                    sovereigntyInfo.alliance_name = allianceData?.name;
                }

                if (sovEntry.corporation_id) {
                    const corpData = await getCachedCorporation(
                        sovEntry.corporation_id
                    );
                    sovereigntyInfo.corporation_name = corpData?.name;
                }
            } catch (error) {
                cliLogger.warn(
                    `Failed to resolve names for system ${
                        sovEntry.system_id
                    }: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }

            systemSovereigntyMap.set(sovEntry.system_id, sovereigntyInfo);
        }

        // Fetch all existing sovereignty documents in bulk for systems we're processing
        const systemIds = Array.from(systemSovereigntyMap.keys());
        const existingDocs = await Sovereignty.find({
            system_id: { $in: systemIds },
        }).lean();
        const existingDocsMap = new Map(
            existingDocs.map((doc) => [doc.system_id, doc])
        );

        cliLogger.info(
            `Found ${existingDocs.length} existing sovereignty documents out of ${systemIds.length} systems to process`
        );

        // Process systems in batches with intelligent deduplication
        for (const [systemId, sovereigntyInfo] of systemSovereigntyMap) {
            const newSovereigntyRecord = {
                alliance_id: sovereigntyInfo.alliance_id,
                alliance_name: sovereigntyInfo.alliance_name,
                corporation_id: sovereigntyInfo.corporation_id,
                corporation_name: sovereigntyInfo.corporation_name,
                faction_id: sovereigntyInfo.faction_id,
                date_added: timestamp, // Historical timestamp from the data file
            };

            const existingDoc = existingDocsMap.get(systemId);

            if (existingDoc) {
                // Compare dates to determine if this is newer or older sovereignty
                const currentDate = new Date(existingDoc.date_added);
                const newDate = timestamp;

                if (newDate > currentDate) {
                    // New entry is newer - it should become the current sovereignty
                    // Move the existing current sovereignty to history
                    const currentSovereignty = {
                        alliance_id: existingDoc.alliance_id,
                        alliance_name: existingDoc.alliance_name,
                        corporation_id: existingDoc.corporation_id,
                        corporation_name: existingDoc.corporation_name,
                        faction_id: existingDoc.faction_id,
                        date_added: existingDoc.date_added,
                    };

                    // Check if sovereignty actually changed
                    const sovereigntyChanged =
                        existingDoc.alliance_id !==
                            newSovereigntyRecord.alliance_id ||
                        existingDoc.corporation_id !==
                            newSovereigntyRecord.corporation_id ||
                        existingDoc.faction_id !==
                            newSovereigntyRecord.faction_id;

                    if (sovereigntyChanged) {
                        bulkOps.push({
                            updateOne: {
                                filter: { system_id: systemId },
                                update: {
                                    // Set new sovereignty as current
                                    $set: {
                                        alliance_id:
                                            newSovereigntyRecord.alliance_id,
                                        alliance_name:
                                            newSovereigntyRecord.alliance_name,
                                        corporation_id:
                                            newSovereigntyRecord.corporation_id,
                                        corporation_name:
                                            newSovereigntyRecord.corporation_name,
                                        faction_id:
                                            newSovereigntyRecord.faction_id,
                                        date_added:
                                            newSovereigntyRecord.date_added,
                                    },
                                    // Move old current sovereignty to history
                                    $push: { history: currentSovereignty },
                                },
                            },
                        });
                    }
                } else {
                    // New entry is older - check if it should be added to history
                    // Build complete timeline including current sovereignty
                    const allSovereignty = [
                        {
                            alliance_id: existingDoc.alliance_id,
                            alliance_name: existingDoc.alliance_name,
                            corporation_id: existingDoc.corporation_id,
                            corporation_name: existingDoc.corporation_name,
                            faction_id: existingDoc.faction_id,
                            date_added: existingDoc.date_added,
                        },
                        ...existingDoc.history,
                    ].sort(
                        (a, b) =>
                            new Date(a.date_added).getTime() -
                            new Date(b.date_added).getTime()
                    );

                    // Find the closest existing entry by date
                    let closestEntry: any = null;
                    let closestTimeDiff = Infinity;

                    for (const entry of allSovereignty) {
                        const timeDiff = Math.abs(
                            new Date(entry.date_added).getTime() -
                                timestamp.getTime()
                        );
                        if (timeDiff < closestTimeDiff) {
                            closestTimeDiff = timeDiff;
                            closestEntry = entry;
                        }
                    }

                    // Check if sovereignty has actually changed compared to the closest entry
                    const sovereigntyChanged =
                        !closestEntry ||
                        closestEntry.alliance_id !==
                            newSovereigntyRecord.alliance_id ||
                        closestEntry.corporation_id !==
                            newSovereigntyRecord.corporation_id ||
                        closestEntry.faction_id !==
                            newSovereigntyRecord.faction_id;

                    if (sovereigntyChanged) {
                        // Check if we already have this exact entry
                        const duplicateExists = allSovereignty.some(
                            (entry) =>
                                entry.alliance_id ===
                                    newSovereigntyRecord.alliance_id &&
                                entry.corporation_id ===
                                    newSovereigntyRecord.corporation_id &&
                                entry.faction_id ===
                                    newSovereigntyRecord.faction_id &&
                                Math.abs(
                                    new Date(entry.date_added).getTime() -
                                        timestamp.getTime()
                                ) < 60000
                        );

                        if (!duplicateExists) {
                            // Add to history (it will be sorted chronologically on read)
                            bulkOps.push({
                                updateOne: {
                                    filter: { system_id: systemId },
                                    update: {
                                        $push: {
                                            history: newSovereigntyRecord,
                                        },
                                    },
                                },
                            });
                        }
                    }
                }
            } else {
                // Document doesn't exist, create new one with this as current sovereignty
                bulkOps.push({
                    insertOne: {
                        document: {
                            system_id: systemId,
                            alliance_id: sovereigntyInfo.alliance_id,
                            alliance_name: sovereigntyInfo.alliance_name,
                            corporation_id: sovereigntyInfo.corporation_id,
                            corporation_name: sovereigntyInfo.corporation_name,
                            faction_id: sovereigntyInfo.faction_id,
                            date_added: timestamp,
                            history: [],
                        },
                    },
                });
            }
        }

        if (bulkOps.length > 0) {
            await Sovereignty.bulkWrite(bulkOps);
            cliLogger.info(
                `Processed ${bulkOps.length} sovereignty records for ${
                    dateStr || "unknown date"
                }`
            );
        }
    } catch (error) {
        cliLogger.error(
            `Failed to process JSON file ${filePath}: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}
