import { Killmail } from "../../../types/IKillmail";
import { Killmails } from "../../models/Killmails";

export default defineEventHandler(async (event) => {
  const killmailData = await readBody(event);

  // Ensure the killmailData is an object, and that it contains the required fields (killmail_id, hash)
  if (
    typeof killmailData !== "object" ||
    killmailData === null ||
    !("killmail_id" in killmailData) ||
    !("hash" in killmailData)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid killmail data",
    });
  }

  // Find out if we already know the killmail
  const existingKillmail: Killmail | null = await Killmails.findOne(
    { killmail_id: killmailData.killmail_id },
    { _id: 0 },
  );
  if (existingKillmail) {
    return { message: "Killmail already exists" };
  }

  // Send the killmail to the queue system (TODO)
  // await sendToQueue(killmailData); (or something like this)

  // Killmail processing can be done really quickly, so we'll stall out for 5 seconds to let it process
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Check if the killmail was processed
  const processedKillmail: Killmail | null = await Killmails.findOne(
    { killmail_id: killmailData.killmail_id },
    { _id: 0 },
  );

  // If the killmail was processed, redirect to /kill/<killmail_id>
  //if (processedKillmail) {
  //    return { redirect: `/kill/${killmailData.killmail_id}` };
  //}

  return { message: "Killmail added" };
});
