import { Killmails } from "../../models/Killmails";
import { Killmail } from "../../../types/IKillmail";

export default defineEventHandler(async () => {
  const latestKillmails = await Killmails.find(
    {},
    {
      _id: 0,
      killmail_id: 1,
      hash: 1,
    },
    {
      sort: { createdAt: -1 },
      limit: 10000,
    },
  ).hint({ createdAt: -1 });

  const result: { [key: string]: string } = {};
  if (latestKillmails) {
    latestKillmails.forEach((killmail: Killmail) => {
      result[killmail.killmail_id] = killmail.hash;
    });
  }

  return result;
});
