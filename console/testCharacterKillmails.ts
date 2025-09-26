import { getCharacter } from "../server/helpers/ESIData";
import { esiFetcherWithLogging } from "../server/helpers/ESIFetcher";
import { cliLogger } from "../server/helpers/Logger";
import { getUserSettingsHelper } from "../server/helpers/UserSettings";
import type { ICharacter } from "../server/interfaces/ICharacter";
import type { IESIKillmail } from "../server/interfaces/IESIKillmail";
import type { IKillmail } from "../server/interfaces/IKillmail";
import { Killmails } from "../server/models/Killmails";
import { KillmailsESI } from "../server/models/KillmailsESI";
import { Users } from "../server/models/Users";
import { addKillmail } from "../server/queue/Killmail";

export default {
    name: "testCharacterKillmails",
    description:
        "Test the processCharacterKillmails workflow with specific character IDs",
    longRunning: false,
    run: async (args: string[]) => {
        try {
            // Parse character IDs from command line arguments
            const characterIds: number[] = [];

            if (args.length === 0) {
                cliLogger.error(
                    "Please provide at least one character ID as an argument"
                );
                cliLogger.info(
                    "Usage: bun run console.ts testCharacterKillmails <characterId1> [characterId2] [characterId3] ..."
                );
                cliLogger.info(
                    "Example: bun run console.ts testCharacterKillmails 90000001 90000002"
                );
                return;
            }

            // Parse and validate character IDs
            for (const arg of args) {
                const characterId = parseInt(arg);
                if (isNaN(characterId) || characterId <= 0) {
                    cliLogger.error(`Invalid character ID: ${arg}`);
                    return;
                }
                characterIds.push(characterId);
            }

            cliLogger.info(
                `Testing processCharacterKillmails workflow with character IDs: ${characterIds.join(
                    ", "
                )}`
            );

            let processedCount = 0;
            let notFoundCount = 0;

            for (const characterId of characterIds) {
                try {
                    // Find the user with this character ID
                    const user = await Users.findOne(
                        { characterId: characterId },
                        {
                            _id: 1,
                            characterId: 1,
                            characterName: 1,
                            accessToken: 1,
                            refreshToken: 1,
                            dateExpiration: 1,
                            canFetchCorporationKillmails: 1,
                            esiActive: 1,
                            lastChecked: 1,
                            settings: 1,
                        }
                    );
                    if (!user) {
                        cliLogger.warn(
                            `Character ID ${characterId} not found in users database`
                        );
                        notFoundCount++;
                        continue;
                    }

                    cliLogger.info(
                        `\n🔄 Processing character: ${
                            (user as any).characterName
                        } (${(user as any).characterId})`
                    );
                    cliLogger.info(
                        `  - Can fetch corp killmails: ${
                            (user as any).canFetchCorporationKillmails
                        }`
                    );
                    cliLogger.info(
                        `  - ESI Active: ${
                            (user as any).esiActive !== false ? "Yes" : "No"
                        }`
                    );
                    cliLogger.info(
                        `  - Token expires: ${(
                            user as any
                        ).dateExpiration.toISOString()}`
                    );
                    cliLogger.info(
                        `  - Last checked: ${(
                            user as any
                        ).lastChecked.toISOString()}`
                    ); // Check if token is expired or about to expire
                    const now = new Date();
                    const tokenExpiresIn =
                        (user as any).dateExpiration.getTime() - now.getTime();
                    const tokenExpiresInMinutes = Math.floor(
                        tokenExpiresIn / (1000 * 60)
                    );

                    if (tokenExpiresIn <= 0) {
                        cliLogger.warn(
                            `  - ⚠️  Token is expired (${Math.abs(
                                tokenExpiresInMinutes
                            )} minutes ago)`
                        );
                    } else if (tokenExpiresInMinutes < 5) {
                        cliLogger.warn(
                            `  - ⚠️  Token expires soon (${tokenExpiresInMinutes} minutes)`
                        );
                    } else {
                        cliLogger.info(
                            `  - ✅ Token is valid (${tokenExpiresInMinutes} minutes remaining)`
                        );
                    }

                    // Process the character directly
                    await processCharacterKillmails({
                        userId: (user as any)._id.toString(),
                        characterId: (user as any).characterId,
                        characterName: (user as any).characterName,
                    });

                    processedCount++;
                } catch (error) {
                    cliLogger.error(
                        `Error processing character ID ${characterId}: ${error}`
                    );
                }
            }

            cliLogger.info(`\n📊 Summary:`);
            cliLogger.info(
                `  - Total characters requested: ${characterIds.length}`
            );
            cliLogger.info(`  - Successfully processed: ${processedCount}`);
            cliLogger.info(`  - Not found in database: ${notFoundCount}`);
            cliLogger.info(
                `  - Errors: ${
                    characterIds.length - processedCount - notFoundCount
                }`
            );

            if (processedCount > 0) {
                cliLogger.info(
                    `\n✅ All characters have been processed successfully!`
                );
                cliLogger.info(`Check the ESI logs in the admin panel at:`);
                cliLogger.info(`/admin/analytics/esi-logs`);
            }
        } catch (error) {
            cliLogger.error(`Fatal error in testCharacterKillmails: ${error}`);
            throw error;
        }
    },
};

// Direct processing function extracted from the queue worker
async function processCharacterKillmails(jobData: {
    userId: string;
    characterId: number;
    characterName: string;
}) {
    const { userId, characterId, characterName } = jobData;

    try {
        cliLogger.info(
            `🔄 Processing character ${characterName} (${characterId})`
        );

        // Get the user from database
        const user = await Users.findById(userId).select({
            accessToken: 1,
            characterId: 1,
            characterName: 1,
            refreshToken: 1,
            dateExpiration: 1,
            canFetchCorporationKillmails: 1,
            settings: 1,
        });

        if (!user) {
            throw new Error(`User not found for ID: ${userId}`);
        }

        let accessToken = (user as any).accessToken;
        let refreshToken = (user as any).refreshToken;
        let dateExpiration = (user as any).dateExpiration;

        // Check if token needs refreshing
        if (dateExpiration.getTime() < Date.now() + 60 * 5 * 1000) {
            cliLogger.info(
                `🔄 Refreshing token for ${characterName} (${characterId})`
            );
            try {
                const newTokens = await getNewRefreshToken(refreshToken);
                if (newTokens.error) {
                    cliLogger.error(
                        `❌ Error refreshing token for ${characterName} (${characterId}): ${newTokens.error} - ${newTokens.error_description}`
                    );

                    // If the refresh token is invalid, deactivate ESI for this user
                    if (
                        newTokens.error === "invalid_grant" &&
                        (newTokens.error_description?.includes(
                            "Invalid refresh token"
                        ) ||
                            newTokens.error_description?.includes(
                                "Token missing/expired"
                            ))
                    ) {
                        cliLogger.warn(
                            `⚠️  Deactivating ESI for ${characterName} (${characterId}) due to invalid/expired refresh token`
                        );
                        await Users.updateOne(
                            { _id: userId },
                            {
                                lastChecked: new Date(),
                                esiActive: false,
                            }
                        );
                    } else {
                        await Users.updateOne(
                            { _id: userId },
                            { lastChecked: new Date() }
                        );
                    }
                    return;
                }

                accessToken = newTokens.access_token;
                dateExpiration = new Date(
                    Date.now() + newTokens.expires_in * 1000
                );
                refreshToken = newTokens.refresh_token;

                // Update the user with the new tokens
                await Users.updateOne(
                    { _id: userId },
                    {
                        accessToken: accessToken,
                        dateExpiration: dateExpiration,
                        refreshToken: refreshToken,
                    }
                );
                cliLogger.info(`✅ Token refreshed successfully`);
            } catch (refreshError) {
                cliLogger.error(
                    `❌ Exception refreshing token for ${characterName} (${characterId}): ${refreshError}`
                );

                // Check if this is a token-related error
                const errorMessage = String(refreshError);
                if (
                    errorMessage.includes("invalid_grant") ||
                    errorMessage.includes("Invalid refresh token") ||
                    errorMessage.includes("Token missing/expired")
                ) {
                    cliLogger.warn(
                        `⚠️  Deactivating ESI for ${characterName} (${characterId}) due to refresh token exception`
                    );
                    await Users.updateOne(
                        { _id: userId },
                        {
                            lastChecked: new Date(),
                            esiActive: false,
                        }
                    );
                } else {
                    await Users.updateOne(
                        { _id: userId },
                        { lastChecked: new Date() }
                    );
                }
                return;
            }
        }

        // Fetch character data
        let character: Partial<ICharacter> | null = null;
        try {
            character = await getCharacter(characterId);
        } catch (charError) {
            cliLogger.error(
                `❌ Error getting character ${characterName} (${characterId}): ${charError}`
            );
            await Users.updateOne({ _id: userId }, { lastChecked: new Date() });
            return;
        }

        if (!character) {
            cliLogger.error(
                `❌ Character data not found for ${characterName} (${characterId})`
            );
            await Users.updateOne({ _id: userId }, { lastChecked: new Date() });
            return;
        }

        const corporationId = character.corporation_id;
        const fetchCorporation = corporationId && corporationId >= 10000000;
        const canFetchCorporationKillmails = (user as any)
            .canFetchCorporationKillmails;

        const killmails: IKillmail[] = [];

        // Fetch character killmails
        cliLogger.info(`📡 Fetching character killmails...`);
        try {
            let page = 1;
            let killmailsPage: IKillmail[] = [];
            const settingsHelper = getUserSettingsHelper(user as any);
            const delayHours = settingsHelper.getSetting("killmailDelay");

            do {
                cliLogger.info(
                    `  🔍 Fetching character killmails page ${page} for ${characterName} (${characterId})`
                );
                killmailsPage = await getCharacterKillmails(
                    accessToken,
                    characterId,
                    page,
                    characterName,
                    delayHours
                );
                killmails.push(...killmailsPage);
                cliLogger.info(
                    `  📄 Page ${page}: Found ${killmailsPage.length} killmails`
                );
                if (killmailsPage.length > 0) {
                    cliLogger.info(
                        `  📝 Sample killmail IDs: ${killmailsPage
                            .slice(0, 3)
                            .map((km) => km.killmail_id)
                            .join(", ")}${
                            killmailsPage.length > 3 ? "..." : ""
                        }`
                    );
                }
                page++;
            } while (killmailsPage.length === 1000);

            cliLogger.info(
                `✅ Total character killmails fetched: ${killmails.length}`
            );
        } catch (killmailError) {
            cliLogger.error(
                `❌ Error fetching character killmails for ${characterName} (${characterId}): ${killmailError}`
            );
        }

        // Fetch corporation killmails if needed
        if (fetchCorporation && canFetchCorporationKillmails && corporationId) {
            cliLogger.info(
                `🏢 Fetching corporation killmails for corporation ${corporationId}...`
            );
            try {
                let page = 1;
                let killmailsPage: IKillmail[] = [];
                const settingsHelper = getUserSettingsHelper(user as any);
                const delayHours = settingsHelper.getSetting("killmailDelay");
                let corpKillmailCount = 0;

                do {
                    try {
                        cliLogger.info(
                            `  🔍 Fetching corporation killmails page ${page} for corp ${corporationId} via ${characterName}`
                        );
                        killmailsPage = await getCorporationKillmails(
                            accessToken,
                            corporationId,
                            page,
                            characterName,
                            delayHours,
                            characterId
                        );

                        // Check if we got an error response indicating no access
                        if (killmailsPage.length === 0 && page === 1) {
                            // This could be an empty result or an access error
                            // The getCorporationKillmails function will have logged the actual response
                            cliLogger.info(
                                `  🔍 No corporation killmails returned - could be no data or access issue`
                            );
                        }

                        killmails.push(...killmailsPage);
                        corpKillmailCount += killmailsPage.length;
                        cliLogger.info(
                            `  🏢 Page ${page}: Found ${killmailsPage.length} corporation killmails`
                        );
                        if (killmailsPage.length > 0) {
                            cliLogger.info(
                                `  📝 Sample corp killmail IDs: ${killmailsPage
                                    .slice(0, 3)
                                    .map((km) => km.killmail_id)
                                    .join(", ")}${
                                    killmailsPage.length > 3 ? "..." : ""
                                }`
                            );
                        }
                        page++;
                    } catch (corpError: any) {
                        cliLogger.error(
                            `  ❌ Corporation killmail fetch error: ${
                                corpError.message || corpError
                            }`
                        );

                        // Check for ESI role errors
                        if (
                            corpError.name === "ESIError" &&
                            corpError.esiResponse?.error?.includes(
                                "Character does not have required role(s)"
                            )
                        ) {
                            cliLogger.warn(
                                `⚠️  Character lacks required corporate roles - updating canFetchCorporationKillmails to false`
                            );
                            await Users.updateOne(
                                { _id: userId },
                                { canFetchCorporationKillmails: false }
                            );
                            break;
                        } else if (
                            corpError.message &&
                            corpError.message.includes(
                                "Character does not have required role(s)"
                            )
                        ) {
                            cliLogger.warn(
                                `⚠️  Character lacks required corporate roles - updating canFetchCorporationKillmails to false`
                            );
                            await Users.updateOne(
                                { _id: userId },
                                { canFetchCorporationKillmails: false }
                            );
                            break;
                        }
                        // If it's not a role error, re-throw to be caught by outer try-catch
                        throw corpError;
                    }
                } while (killmailsPage.length === 1000);

                cliLogger.info(
                    `✅ Total corporation killmails fetched: ${corpKillmailCount}`
                );
            } catch (corpKillmailError) {
                cliLogger.error(
                    `❌ Error fetching corporation killmails for ${characterName} (${characterId}): ${corpKillmailError}`
                );
            }
        } else if (fetchCorporation && !canFetchCorporationKillmails) {
            cliLogger.info(
                `⚠️  Skipping corporation killmails (user lacks permission)`
            );
        } else {
            cliLogger.info(
                `ℹ️  No corporation or corporation ID < 10000000, skipping corp killmails`
            );
        }

        // Filter out killmails we've already seen
        cliLogger.info(`🔍 Filtering new killmails...`);
        const filteredKillmails: IKillmail[] = [];
        for (const killmail of killmails) {
            try {
                const killmailId = killmail.killmail_id;
                const killmailHash = killmail.killmail_hash;
                if (!killmailId || !killmailHash) continue;

                const killmailExists = await KillmailsESI.exists({
                    killmail_id: killmailId,
                    killmail_hash: killmailHash,
                });
                if (!killmailExists) {
                    filteredKillmails.push(killmail);
                }
            } catch (filterError) {
                cliLogger.error(
                    `❌ Error checking if killmail exists: ${filterError}`
                );
            }
        }

        cliLogger.info(
            `📊 Results: ${killmails.length} total, ${filteredKillmails.length} new killmails`
        );

        // Process new killmails
        if (filteredKillmails.length > 0) {
            cliLogger.info(
                `⚡ Processing ${filteredKillmails.length} new killmails...`
            );

            for (const killmail of filteredKillmails) {
                try {
                    const killmailId = killmail.killmail_id;
                    const killmailHash = killmail.killmail_hash;

                    // Calculate delayedUntil based on user's killmailDelay setting
                    const settingsHelper = getUserSettingsHelper(user as any);
                    const delayHours =
                        settingsHelper.getSetting("killmailDelay");
                    const delayedUntil =
                        delayHours > 0
                            ? new Date(Date.now() + delayHours * 60 * 60 * 1000)
                            : null;

                    // Save/update killmail in ESI collection with delay
                    try {
                        const existingKillmail = (await KillmailsESI.findOne({
                            killmail_id: killmailId,
                        })) as IESIKillmail | null;

                        if (existingKillmail) {
                            // If killmail exists, only update delay if new delay is shorter (or no delay)
                            const shouldUpdateDelay =
                                !delayedUntil ||
                                !existingKillmail.delayedUntil ||
                                delayedUntil < existingKillmail.delayedUntil;

                            if (shouldUpdateDelay) {
                                await KillmailsESI.updateOne(
                                    { killmail_id: killmailId },
                                    { delayedUntil: delayedUntil }
                                );
                                if (delayHours > 0) {
                                    cliLogger.info(
                                        `  ⏰ Updated killmail ${killmailId} delay to ${delayHours} hours`
                                    );
                                }
                            }
                        } else {
                            // Create new ESI killmail entry with delay
                            const esiKillmail = new KillmailsESI({
                                killmail_id: killmailId,
                                killmail_hash: killmailHash,
                                processed: false,
                                delayedUntil: delayedUntil,
                            });

                            await esiKillmail.save();
                            if (delayHours > 0) {
                                cliLogger.info(
                                    `  💾 Saved killmail ${killmailId} with ${delayHours} hour delay`
                                );
                            } else {
                                cliLogger.info(
                                    `  💾 Saved killmail ${killmailId} for immediate processing`
                                );
                            }
                        }

                        // If no delay, add to processing queue immediately
                        if (!delayedUntil) {
                            await addKillmail(killmailId, killmailHash, 0, 1);
                            cliLogger.info(
                                `  ⚡ Queued killmail ${killmailId} for processing`
                            );
                        }
                    } catch (saveError) {
                        cliLogger.error(
                            `❌ Error saving killmail ${killmailId} to ESI collection: ${saveError}`
                        );
                        // Fallback to immediate processing
                        await addKillmail(killmailId, killmailHash, 0, 1);
                    }
                } catch (queueError) {
                    cliLogger.error(
                        `❌ Error processing killmail ${killmail.killmail_id}: ${queueError}`
                    );
                    // Fallback to immediate processing
                    try {
                        await addKillmail(
                            killmail.killmail_id,
                            killmail.killmail_hash,
                            0,
                            1
                        );
                    } catch (fallbackError) {
                        cliLogger.error(
                            `❌ Error adding killmail to queue as fallback: ${fallbackError}`
                        );
                    }
                }
            }
        }

        // Update the lastChecked date
        await Users.updateOne({ _id: userId }, { lastChecked: new Date() });

        cliLogger.info(
            `✅ Completed processing character ${characterName} (${characterId})`
        );
        if (filteredKillmails.length > 0) {
            cliLogger.info(
                `🎯 Found ${filteredKillmails.length} new killmails for processing`
            );
        }
    } catch (error) {
        cliLogger.error(
            `❌ Error processing character ${characterName} (${characterId}): ${error}`
        );
        // Make sure to update lastChecked to prevent repeatedly trying a problematic user
        try {
            await Users.updateOne({ _id: userId }, { lastChecked: new Date() });
        } catch (updateError) {
            cliLogger.error(
                `❌ Failed to update lastChecked for user ${userId}: ${updateError}`
            );
        }
        throw error; // Re-throw to mark job as failed
    }
}

// Helper functions copied from processCharacterKillmails.ts
async function getCharacterKillmails(
    accessToken: string,
    characterId: number,
    page = 1,
    characterName?: string,
    killmailDelay?: number
): Promise<IKillmail[]> {
    try {
        const url = `${
            process.env.ESI_URL || "https://esi.evetech.net/"
        }latest/characters/${characterId}/killmails/recent/?page=${page}`;
        cliLogger.info(`🌐 Making ESI request to: ${url}`);

        const killmails = await esiFetcherWithLogging(
            url,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
            {
                characterId,
                characterName: characterName || `Character ${characterId}`,
                dataType: "character_killmails",
                source: "testCharacterKillmails",
                killmailDelay,
                extractDataIds: (data: any) => {
                    cliLogger.info(
                        `📊 ESI Response data type: ${typeof data}, isArray: ${Array.isArray(
                            data
                        )}, length: ${
                            Array.isArray(data) ? data.length : "N/A"
                        }`
                    );
                    if (Array.isArray(data) && data.length > 0) {
                        cliLogger.info(
                            `📋 First few killmail objects: ${JSON.stringify(
                                data.slice(0, 2),
                                null,
                                2
                            )}`
                        );
                    }
                    if (Array.isArray(data)) {
                        return data.map((km: any) => ({
                            id: km.killmail_id,
                            hash: km.killmail_hash,
                            additionalInfo: {
                                killmail_time: km.killmail_time,
                            },
                        }));
                    }
                    return [];
                },
                checkNewItems: async (items) => {
                    let newCount = 0;
                    for (const item of items) {
                        const exists = await KillmailsESI.exists({
                            killmail_id: item.id,
                            killmail_hash: item.hash,
                        });
                        if (!exists) {
                            newCount++;
                        }
                    }
                    return newCount;
                },
            }
        );
        cliLogger.info(
            `✅ ESI fetcher returned ${
                Array.isArray(killmails) ? killmails.length : "non-array"
            } killmails`
        );
        return Array.isArray(killmails) ? killmails : [];
    } catch (error: any) {
        cliLogger.error(`❌ Error fetching character killmails: ${error}`);

        // Re-throw ESI errors so they can be handled at a higher level
        if (error.name === "ESIError") {
            throw error;
        }
        return [];
    }
}

async function getCorporationKillmails(
    accessToken: string,
    corporationId: number,
    page = 1,
    characterName?: string,
    killmailDelay?: number,
    characterId?: number
): Promise<IKillmail[]> {
    try {
        const url = `${
            process.env.ESI_URL || "https://esi.evetech.net/"
        }latest/corporations/${corporationId}/killmails/recent/?page=${page}`;
        cliLogger.info(`🌐 Making ESI request to: ${url}`);

        const killmails = await esiFetcherWithLogging(
            url,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
            {
                characterId: characterId || 0,
                characterName: characterName || `Corporation ${corporationId}`,
                dataType: "corporation_killmails",
                source: "testCharacterKillmails",
                killmailDelay,
                extractDataIds: (data: any) => {
                    cliLogger.info(
                        `📊 ESI Corp Response data type: ${typeof data}, isArray: ${Array.isArray(
                            data
                        )}, length: ${
                            Array.isArray(data) ? data.length : "N/A"
                        }`
                    );
                    if (Array.isArray(data) && data.length > 0) {
                        cliLogger.info(
                            `📋 First few corp killmail objects: ${JSON.stringify(
                                data.slice(0, 2),
                                null,
                                2
                            )}`
                        );
                    }
                    if (Array.isArray(data)) {
                        return data.map((km: any) => ({
                            id: km.killmail_id,
                            hash: km.killmail_hash,
                            additionalInfo: {
                                killmail_time: km.killmail_time,
                            },
                        }));
                    }
                    return [];
                },
                checkNewItems: async (items) => {
                    let newCount = 0;
                    for (const item of items) {
                        const exists = await Killmails.exists({
                            killmail_id: item.id,
                            killmail_hash: item.hash,
                        });
                        if (!exists) {
                            newCount++;
                        }
                    }
                    return newCount;
                },
            }
        );
        cliLogger.info(
            `✅ ESI Corp fetcher returned ${
                Array.isArray(killmails) ? killmails.length : "non-array"
            } killmails`
        );
        return Array.isArray(killmails) ? killmails : [];
    } catch (error: any) {
        cliLogger.error(`❌ Error fetching corporation killmails: ${error}`);

        // Re-throw ESI errors so they can be handled at a higher level
        if (error.name === "ESIError") {
            throw error;
        }
        return [];
    }
}

async function getNewRefreshToken(refreshToken: string) {
    try {
        const authorization = Buffer.from(
            `${process.env.EVE_CLIENT_ID}:${process.env.EVE_CLIENT_SECRET}`
        ).toString("base64");
        const payload = {
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        };

        const response = await fetch(
            "https://login.eveonline.com/v2/oauth/token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "EVE-KILL",
                    Authorization: `Basic ${authorization}`,
                },
                body: new URLSearchParams(payload).toString(),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            cliLogger.error(
                `Token refresh failed: ${response.status} - ${errorText}`
            );
        }

        const data = await response.json();
        return data;
    } catch (error) {
        cliLogger.error(`Exception during token refresh: ${error}`);
        return { error: "Exception", error_description: String(error) };
    }
}
