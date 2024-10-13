import { Killmails } from "../../models/Killmails";
import { Killmail } from "../../../types/IKillmail";

export default defineEventHandler(async (event) => {
  const killmailIds = await readBody(event);

  // Verify killmailIds is an array, and it contains only numbers, and is not empty
  if (
    !Array.isArray(killmailIds) ||
    killmailIds.length === 0 ||
    killmailIds.some((id) => typeof id !== "number")
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid killmailIds",
    });
  }

  const killmails: Killmail[] | null = await Killmails.find(
    { killmail_id: { $in: killmailIds } },
    { _id: 0 },
  );
  return killmails;
});
