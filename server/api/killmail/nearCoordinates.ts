import { Killmails } from "../../models/Killmails";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const systemId = parseInt(query.system_id as string);
  const distanceInMeters = parseInt(query.distanceInMeters as string);
  const x = parseFloat(query.x as string);
  const y = parseFloat(query.y as string);
  const z = parseFloat(query.z as string);
  const days = parseInt(query.days as string) || 1;

  const results = await Killmails.aggregate([
    {
      $match: {
        system_id: systemId,
        x: { $gt: x - distanceInMeters, $lt: x + distanceInMeters },
        y: { $gt: y - distanceInMeters, $lt: y + distanceInMeters },
        z: { $gt: z - distanceInMeters, $lt: z + distanceInMeters },
        kill_time: { $gte: new Date(Date.now() - days * 86400 * 1000) },
      },
    },
    {
      $project: {
        killmail_id: 1,
        distance: {
          $sqrt: {
            $add: [
              { $pow: [{ $subtract: ["$x", x] }, 2] },
              { $pow: [{ $subtract: ["$y", y] }, 2] },
              { $pow: [{ $subtract: ["$z", z] }, 2] },
            ],
          },
        },
      },
    },
    { $match: { distance: { $lt: distanceInMeters } } },
    { $sort: { distance: -1 } },
    { $limit: 10 },
  ]);

  return results;
});
