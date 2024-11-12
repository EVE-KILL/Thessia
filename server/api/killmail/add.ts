// Import the Killmail type and Killmails model
import { Killmail } from "../../../types/IKillmail";
import { Killmails } from "../../models/Killmails";

// Define the event handler for adding a killmail
export default defineEventHandler(async (event) => {
  // Read the body of the incoming request to get the killmail data
  const killmailData = await readBody(event);

  // Ensure the killmailData is an object, and that it contains the required fields (killmail_id, hash)
  if (
    typeof killmailData !== "object" ||
    killmailData === null ||
    !("killmail_id" in killmailData) ||
    !("hash" in killmailData)
  ) {
    // If validation fails, throw a 400 error with an appropriate message
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid killmail data",
    });
  }

  // Find out if we already know the killmail by querying the database
  const existingKillmail: Killmail | null = await Killmails.findOne(
    { killmail_id: killmailData.killmail_id },
    { _id: 0 },
  );
  // If the killmail already exists, return a message indicating so
  if (existingKillmail) {
    return { message: "Killmail already exists" };
  }

  // Send the killmail to the queue system (TODO)
  // await sendToQueue(killmailData); (or something like this)

  // Killmail processing can be done really quickly, so we'll stall out for 5 seconds to let it process
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Check if the killmail was processed by querying the database again
  const processedKillmail: Killmail | null = await Killmails.findOne(
    { killmail_id: killmailData.killmail_id },
    { _id: 0 },
  );

  // If the killmail was processed, redirect to /kill/<killmail_id>
  //if (processedKillmail) {
  //    return { redirect: `/kill/${killmailData.killmail_id}` };
  //}

  // Return a message indicating that the killmail has been added
  return { message: "Killmail added" };
});
