import type { PipelineStage } from "mongoose";
import type { IKillmail } from "../../../interfaces/IKillmail";
import { Killmails } from "../../../models/Killmails";

export default defineEventHandler(async (event) => {
  const killmail_id = event.context.params?.id;

  const killmail: IKillmail | null = await Killmails.findOne(
    {
      killmail_id: killmail_id,
    },
    { _id: 0, system_id: 1, kill_time: 1 },
  );
  if (!killmail) {
    throw createError({
      statusCode: 400,
      statusMessage: "Killmail not found",
    });
  }

  const systemId = killmail?.system_id;
  const unixTime = Math.floor(Number(killmail?.kill_time));
  const killTimeStart = new Date(unixTime - 3600 * 1000);
  const killTimeEnd = new Date(unixTime + 3600 * 1000);

  const pipeline: PipelineStage[] = [
    {
      $match: {
        system_id: systemId,
        kill_time: { $gte: killTimeStart, $lt: killTimeEnd },
      },
    },
    {
      $group: {
        _id: "$system_id",
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        count: { $gt: 25 },
      },
    },
    {
      $sort: {
        count: -1,
      },
    },
    {
      $limit: 1,
    },
  ];

  const result = await Killmails.aggregate(pipeline);

  if (result.length === 0) {
    return { inBattle: false };
  }

  return { inBattle: true };
});
