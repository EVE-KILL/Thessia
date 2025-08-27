import type { Job } from "bullmq";
import { getCharacter } from "../server/helpers/ESIData";
import { esiFetcherWithLogging } from "../server/helpers/ESIFetcher";
import { cliLogger } from "../server/helpers/Logger";
import { createWorker } from "../server/helpers/Queue";
import { getUserSettingsHelper } from "../server/helpers/UserSettings";
import type { ICharacter } from "../server/interfaces/ICharacter";
import type { IESIKillmail } from "../server/interfaces/IESIKillmail";
import type { IKillmail } from "../server/interfaces/IKillmail";
import type { IUser } from "../server/interfaces/IUser";
import { Killmails } from "../server/models/Killmails";
import { KillmailsESI } from "../server/models/KillmailsESI";
import { Users } from "../server/models/Users";
import { addKillmail } from "../server/queue/Killmail";

export default {
    name: "process:character-killmails",
    description: "Processes individual characters for killmail fetching",
    run: async () => {
        cliLogger.info("✔ Starting character killmail processor");

        createWorker(
            "character-killmails",
            async (job: Job) => {
                const { userId, characterId, characterName } = job.data;

                try {
                    cliLogger.info(
                        `Processing character ${characterName} (${characterId})`
                    );

                    // Get the user from database
                    const user = (await Users.findById(userId).select({
                        accessToken: 1,
                        characterId: 1,
                        characterName: 1,
                        refreshToken: 1,
                        dateExpiration: 1,
                        canFetchCorporationKillmails: 1,
                        settings: 1,
                    })) as IUser | null;

                    if (!user) {
                        throw new Error(`User not found for ID: ${userId}`);
                    }

                    let accessToken = user.accessToken;
                    let refreshToken = user.refreshToken;
                    let dateExpiration = user.dateExpiration;

                    // Check if token needs refreshing
                    if (dateExpiration.getTime() < Date.now() + 60 * 5 * 1000) {
                        cliLogger.info(
                            `Refreshing token for ${characterName} (${characterId})`
                        );
                        try {
                            const newTokens = await getNewRefreshToken(
                                refreshToken
                            );
                            if (newTokens.error) {
                                cliLogger.error(
                                    `Error refreshing token for ${characterName} (${characterId}): ${newTokens.error} - ${newTokens.error_description}`
                                );
                                await Users.updateOne(
                                    { _id: userId },
                                    { lastChecked: new Date() }
                                );
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
                        } catch (refreshError) {
                            cliLogger.error(
                                `Exception refreshing token for ${characterName} (${characterId}): ${refreshError}`
                            );
                            await Users.updateOne(
                                { _id: userId },
                                { lastChecked: new Date() }
                            );
                            return;
                        }
                    }

                    // Fetch character data
                    let character: Partial<ICharacter> | null = null;
                    try {
                        character = await getCharacter(characterId);
                    } catch (charError) {
                        cliLogger.error(
                            `Error getting character ${characterName} (${characterId}): ${charError}`
                        );
                        await Users.updateOne(
                            { _id: userId },
                            { lastChecked: new Date() }
                        );
                        return;
                    }

                    if (!character) {
                        cliLogger.error(
                            `Character data not found for ${characterName} (${characterId})`
                        );
                        await Users.updateOne(
                            { _id: userId },
                            { lastChecked: new Date() }
                        );
                        return;
                    }

                    const corporationId = character.corporation_id;
                    const fetchCorporation =
                        corporationId && corporationId >= 10000000;
                    const canFetchCorporationKillmails =
                        user.canFetchCorporationKillmails;

                    const killmails: IKillmail[] = [];

                    // Fetch character killmails
                    try {
                        let page = 1;
                        let killmailsPage: IKillmail[] = [];
                        const settingsHelper = getUserSettingsHelper(user);
                        const delayHours =
                            settingsHelper.getSetting("killmailDelay");

                        do {
                            killmailsPage = await getCharacterKillmails(
                                accessToken,
                                characterId,
                                page,
                                characterName,
                                delayHours
                            );
                            killmails.push(...killmailsPage);
                            page++;
                        } while (killmailsPage.length === 1000);
                    } catch (killmailError) {
                        cliLogger.error(
                            `Error fetching character killmails for ${characterName} (${characterId}): ${killmailError}`
                        );
                    }

                    // Fetch corporation killmails if needed
                    if (
                        fetchCorporation &&
                        canFetchCorporationKillmails &&
                        corporationId
                    ) {
                        try {
                            let page = 1;
                            let killmailsPage: IKillmail[] = [];
                            const settingsHelper = getUserSettingsHelper(user);
                            const delayHours =
                                settingsHelper.getSetting("killmailDelay");

                            do {
                                try {
                                    killmailsPage =
                                        await getCorporationKillmails(
                                            accessToken,
                                            corporationId,
                                            page,
                                            characterName,
                                            delayHours,
                                            characterId
                                        );
                                    killmails.push(...killmailsPage);
                                    page++;
                                } catch (corpError: any) {
                                    if (
                                        corpError.message &&
                                        corpError.message.includes(
                                            "Character does not have required role(s)"
                                        )
                                    ) {
                                        await Users.updateOne(
                                            { _id: userId },
                                            {
                                                canFetchCorporationKillmails:
                                                    false,
                                            }
                                        );
                                        cliLogger.info(
                                            `User ${characterName} (${characterId}) does not have the required role to fetch corporation killmails`
                                        );
                                        break;
                                    }
                                    throw corpError;
                                }
                            } while (killmailsPage.length === 1000);
                        } catch (corpKillmailError) {
                            cliLogger.error(
                                `Error fetching corporation killmails for ${characterName} (${characterId}): ${corpKillmailError}`
                            );
                        }
                    }

                    // Filter out killmails we've already seen
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
                                `Error checking if killmail exists: ${filterError}`
                            );
                        }
                    }

                    // Send the killmails to the killmail processing queue with delay handling
                    for (const killmail of filteredKillmails) {
                        try {
                            const killmailId = killmail.killmail_id;
                            const killmailHash = killmail.killmail_hash;

                            // Calculate delayedUntil based on user's killmailDelay setting
                            const settingsHelper = getUserSettingsHelper(user);
                            const delayHours =
                                settingsHelper.getSetting("killmailDelay");
                            const delayedUntil =
                                delayHours > 0
                                    ? new Date(
                                          Date.now() +
                                              delayHours * 60 * 60 * 1000
                                      )
                                    : null;

                            // Save/update killmail in ESI collection with delay
                            try {
                                const existingKillmail =
                                    (await KillmailsESI.findOne({
                                        killmail_id: killmailId,
                                    })) as IESIKillmail | null;

                                if (existingKillmail) {
                                    // If killmail exists, only update delay if new delay is shorter (or no delay)
                                    const shouldUpdateDelay =
                                        !delayedUntil ||
                                        !existingKillmail.delayedUntil ||
                                        delayedUntil <
                                            existingKillmail.delayedUntil;

                                    if (shouldUpdateDelay) {
                                        await KillmailsESI.updateOne(
                                            { killmail_id: killmailId },
                                            { delayedUntil: delayedUntil }
                                        );

                                        if (delayHours > 0) {
                                            cliLogger.info(
                                                `Updated killmail ${killmailId} delay to ${delayHours} hours`
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
                                            `Saved killmail ${killmailId} with ${delayHours} hour delay`
                                        );
                                    }
                                }

                                // If no delay, add to processing queue immediately
                                if (!delayedUntil) {
                                    await addKillmail(
                                        killmailId,
                                        killmailHash,
                                        0,
                                        1
                                    );
                                }
                            } catch (saveError) {
                                cliLogger.error(
                                    `Error saving killmail ${killmailId} to ESI collection: ${saveError}`
                                );
                                // Fallback to immediate processing
                                await addKillmail(
                                    killmailId,
                                    killmailHash,
                                    0,
                                    1
                                );
                            }
                        } catch (queueError) {
                            cliLogger.error(
                                `Error processing killmail ${killmail.killmail_id}: ${queueError}`
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
                                    `Error adding killmail to queue as fallback: ${fallbackError}`
                                );
                            }
                        }
                    }

                    // Update the lastChecked date
                    await Users.updateOne(
                        { _id: userId },
                        { lastChecked: new Date() }
                    );

                    if (filteredKillmails.length > 0) {
                        cliLogger.info(
                            `Found ${filteredKillmails.length} new killmails for ${characterName} (${characterId})`
                        );
                    }

                    cliLogger.info(
                        `Completed processing character ${characterName} (${characterId})`
                    );
                } catch (error) {
                    cliLogger.error(
                        `Error processing character ${characterName} (${characterId}): ${error}`
                    );
                    // Make sure to update lastChecked to prevent repeatedly trying a problematic user
                    try {
                        await Users.updateOne(
                            { _id: userId },
                            { lastChecked: new Date() }
                        );
                    } catch (updateError) {
                        cliLogger.error(
                            `Failed to update lastChecked for user ${userId}: ${updateError}`
                        );
                    }
                    throw error; // Re-throw to mark job as failed
                }
            },
            {
                concurrency: 3,
            }
        )
            .on("failed", (job: Job | undefined, err: Error) => {
                cliLogger.error(
                    `Character killmail processing failed: Job ${job?.id} | Character: ${job?.data.characterName} (${job?.data.characterId}) | Error: ${err.message}`
                );
            })
            .on("completed", (job: Job) => {
                cliLogger.info(
                    `Character killmail processing completed: ${job.data.characterName} (${job.data.characterId})`
                );
            });
    },
};

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
                source: "characterKillmailQueue",
                killmailDelay,
                extractDataIds: (data: any) => {
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
        return Array.isArray(killmails) ? killmails : [];
    } catch (error) {
        cliLogger.error(`Error fetching character killmails: ${error}`);
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
                source: "characterKillmailQueue",
                killmailDelay,
                extractDataIds: (data: any) => {
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
        return Array.isArray(killmails) ? killmails : [];
    } catch (error) {
        cliLogger.error(`Error fetching corporation killmails: ${error}`);
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
