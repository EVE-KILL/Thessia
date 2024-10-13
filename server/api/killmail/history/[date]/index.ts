import { Killmails } from "../../../../models/Killmails";
import { Killmail } from "../../../../../types/IKillmail";

export default defineEventHandler(async (event) => {
  const date = event.context.params?.date as string;

  const dateRegex = /^\d{8}$/;
  if (!dateRegex.test(date)) {
    return { error: "Invalid date format. Expected Ymd." };
  }

  const startDate = new Date(
    `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
  );
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  // Convert to Unix time and back to Date for MongoDB
  const startUnixTime = Math.floor(startDate.getTime());
  const endUnixTime = Math.floor(endDate.getTime());

  console.log(startDate, endDate);

  const killmails: Killmail[] | null = await Killmails.find(
    {
      kill_time: { $gte: new Date(startUnixTime), $lt: new Date(endUnixTime) },
    },
    { killmail_id: 1, hash: 1 },
  );

  const result: { [key: string]: string } = {};
  if (killmails) {
    killmails.forEach((killmail) => {
      result[killmail.killmail_id] = killmail.hash;
    });
  }

  return result;
});
