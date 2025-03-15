import type { ICharacter } from "~/interfaces/ICharacter";
import type { IKillmail } from "~/interfaces/IKillmail";
import { getCharacter } from "../server/helpers/ESIData";
import { esiFetcher } from "../server/helpers/ESIFetcher";
import { cliLogger } from "../server/helpers/Logger";
import { Killmails } from "../server/models/Killmails";
import { Users } from "../server/models/Users";
import { addKillmail } from "../server/queue/Killmail";

export default {
  name: "killmailFetch",
  description: "Fetches killmails from ESI Tokens",
  schedule: "* * * * *",
  run: async () => {
    try {
      cliLogger.info("Starting killmail fetch job");
      // Fetch all users that haven't been checked in the last 5 minutes
      const users = await Users.find(
        { lastChecked: { $lt: new Date(Date.now() - 60 * 5 * 1000) } },
        {
          _id: 1,
          accessToken: 1,
          characterId: 1,
          characterName: 1,
          refreshToken: 1,
          dateExpiration: 1,
          canFetchCorporationKillmails: 1, // Added this field to fix potential undefined
        },
      );

      cliLogger.info(`Found ${users.length} users to process`);

      for (const user of users) {
        try {
          let accessToken = user.accessToken;
          const characterId = user.characterId;
          const characterName = user.characterName;
          let refreshToken = user.refreshToken;
          let dateExpiration = user.dateExpiration;

          // dateExpiration is the date when the token expires, if that time is less than 5 minutes away, we refresh the token
          if (dateExpiration.getTime() < Date.now() + 60 * 5 * 1000) {
            cliLogger.info(`Refreshing token for ${characterName} (${characterId})`);
            try {
              const newTokens = await getNewRefreshToken(refreshToken);
              if (newTokens.error) {
                cliLogger.error(
                  `Error refreshing token for ${characterName} (${characterId}): ${newTokens.error} - ${newTokens.error_description}`,
                );
                await Users.updateOne({ _id: user._id }, { lastChecked: new Date() });
                continue;
              }

              accessToken = newTokens.access_token;
              dateExpiration = new Date(Date.now() + newTokens.expires_in * 1000);
              refreshToken = newTokens.refresh_token;

              // Update the user with the new tokens
              await Users.updateOne(
                { _id: user._id },
                {
                  accessToken: accessToken,
                  dateExpiration: dateExpiration,
                  refreshToken: refreshToken,
                },
              );
            } catch (refreshError) {
              cliLogger.error(
                `Exception refreshing token for ${characterName} (${characterId}): ${refreshError}`,
              );
              await Users.updateOne({ _id: user._id }, { lastChecked: new Date() });
              continue;
            }
          }

          // Fetch character data
          let character: Partial<ICharacter> | null = null;
          try {
            character = await getCharacter(characterId);
          } catch (charError) {
            cliLogger.error(
              `Error getting character ${characterName} (${characterId}): ${charError}`,
            );
            await Users.updateOne({ _id: user._id }, { lastChecked: new Date() });
            continue;
          }

          const corporationId = character.corporation_id;

          // If the corporation id is under 10000000 we don't wanna fetch corporation killmails
          const fetchCorporation = corporationId >= 10000000;
          const canFetchCorporationKillmails = user.canFetchCorporationKillmails;

          const killmails = [];

          // Fetch character killmails
          try {
            // We can get upto 1000 killmails back at a time, if we get 1000 back we need to fetch more by increasing the page number
            let page = 1;
            let killmailsPage = [];
            do {
              killmailsPage = await getCharacterKillmails(accessToken, characterId, page);
              killmails.push(...killmailsPage);
              page++;
            } while (killmailsPage.length === 1000);
          } catch (killmailError) {
            cliLogger.error(
              `Error fetching character killmails for ${characterName} (${characterId}): ${killmailError}`,
            );
          }

          // Fetch corporation killmails if needed
          if (fetchCorporation && canFetchCorporationKillmails) {
            try {
              let page = 1;
              let killmailsPage = [];
              do {
                killmailsPage = await getCorporationKillmails(accessToken, corporationId, page);
                if (killmailsPage.error === "Character does not have required role(s)") {
                  await Users.updateOne({ _id: user._id }, { canFetchCorporationKillmails: false });
                  cliLogger.info(
                    `User ${characterName} (${characterId}) does not have the required role to fetch corporation killmails`,
                  );
                  break;
                }
                killmails.push(...killmailsPage);
                page++;
              } while (killmailsPage.length === 1000);
            } catch (corpKillmailError) {
              cliLogger.error(
                `Error fetching corporation killmails for ${characterName} (${characterId}): ${corpKillmailError}`,
              );
            }
          }

          // Filter out killmails we've already seen
          const filteredKillmails = [];
          for (const killmail of killmails) {
            try {
              const killmailId = killmail.killmail_id;
              const killmailHash = killmail.killmail_hash;
              if (!killmailId || !killmailHash) continue;

              const killmailExists = await Killmails.exists({
                killmail_id: killmailId,
                killmail_hash: killmailHash,
              });
              if (!killmailExists) {
                filteredKillmails.push(killmail);
              }
            } catch (filterError) {
              cliLogger.error(`Error checking if killmail exists: ${filterError}`);
            }
          }

          // Send the killmails to the killmail processing queue
          for (const killmail of filteredKillmails) {
            try {
              await addKillmail(killmail.killmail_id, killmail.killmail_hash, null, 1);
            } catch (queueError) {
              cliLogger.error(`Error adding killmail to queue: ${queueError}`);
            }
          }

          // Update the lastChecked date
          await Users.updateOne({ _id: user._id }, { lastChecked: new Date() });

          if (filteredKillmails.length > 0) {
            cliLogger.info(
              `Found ${filteredKillmails.length} new killmails for ${characterName} (${characterId})`,
            );
          }
        } catch (userError) {
          cliLogger.error(
            `Error processing user ${user.characterName} (${user.characterId}): ${userError}`,
          );
          // Make sure to update lastChecked to prevent repeatedly trying a problematic user
          await Users.updateOne({ _id: user._id }, { lastChecked: new Date() });
        }
      }

      cliLogger.info("Killmail fetch job completed successfully");
    } catch (error) {
      cliLogger.error(`Fatal error in killmail fetch job: ${error}`);
      throw error; // Re-throw to ensure the job is marked as failed
    }
  },
};

async function getCharacterKillmails(
  accessToken: string,
  characterId: number,
  page = 1,
): Promise<IKillmail[]> {
  try {
    const killmails = await esiFetcher(
      `${process.env.ESI_URL || "https://esi.evetech.net/"}latest/characters/${characterId}/killmails/recent/?page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
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
): Promise<IKillmail[]> {
  try {
    const killmails = await esiFetcher(
      `${process.env.ESI_URL || "https://esi.evetech.net/"}latest/corporations/${corporationId}/killmails/recent/?page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
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
      `${process.env.EVE_CLIENT_ID}:${process.env.EVE_CLIENT_SECRET}`,
    ).toString("base64");
    const payload = {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    };

    const response = await fetch("https://login.eveonline.com/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "EVE-KILL",
        Authorization: `Basic ${authorization}`,
      },
      body: new URLSearchParams(payload).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      cliLogger.error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    cliLogger.error(`Exception during token refresh: ${error}`);
    return { error: "Exception", error_description: String(error) };
  }
}
