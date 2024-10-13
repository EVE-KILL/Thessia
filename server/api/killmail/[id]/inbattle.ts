import { PipelineStage } from "mongoose";
import { Killmail } from "../../../../types/IKillmail";
import { Killmails } from "../../../models/Killmails";

export default defineEventHandler(async (event) => {
  let killmail_id = event.context.params?.id;

  let killmail: Killmail | null = await Killmails.findOne({ killmail_id: killmail_id }, { _id: 0, system_id: 1, kill_time: 1 });
  if (!killmail) {
    throw createError({
      statusCode: 400,
      statusMessage: "Killmail not found",
    });
  }

  let systemId = killmail?.system_id;
  let unixTime = Math.floor(Number(killmail?.kill_time));
  let killTimeStart = new Date(unixTime - 3600 * 1000);
  let killTimeEnd = new Date(unixTime + 3600 * 1000);

  let pipeline: PipelineStage[] = [
    {
      '$match': {
        system_id: systemId,
        kill_time: { $gte: killTimeStart, $lt: killTimeEnd }
      },
    },
    {
      '$group': {
        _id: "$system_id",
        count: { $sum: 1 }
      },
    },
    {
      '$match': {
        count: { $gt: 25 }
      },
    },
    {
      '$sort': {
        count: -1
      },
    },
    {
      '$limit': 1
    }
  ];

  let result = await Killmails.aggregate(pipeline);

  console.log(result);

  if (result.length === 0) {
    return { inBattle: false };
  }

  return { inBattle: true };
});
