import { Killmails } from "../../models/Killmails";
import { Celestials } from "../../models/Celestials";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const celestialId = Number.parseInt(query.celestial_id as string);
  const distanceInMeters = Number.parseInt(query.distanceInMeters as string);
  const days = Number.parseInt(query.days as string) || 1;

  const celestial = await Celestials.findOne(
    { item_id: celestialId },
    {
      _id: 0,
    },
  );
  if (!celestial) {
    return { error: "Celestial not found" };
  }

  const results = await Killmails.aggregate([
    {
      $match: {
        system_id: celestial.solar_system_id,
        x: {
          $gt: celestial.x - distanceInMeters,
          $lt: celestial.x + distanceInMeters,
        },
        y: {
          $gt: celestial.y - distanceInMeters,
          $lt: celestial.y + distanceInMeters,
        },
        z: {
          $gt: celestial.z - distanceInMeters,
          $lt: celestial.z + distanceInMeters,
        },
        kill_time: { $gte: new Date(Date.now() - days * 86400 * 1000) },
      },
    },
    {
      $project: {
        killmail_id: 1,
        distance: {
          $sqrt: {
            $add: [
              { $pow: [{ $subtract: ["$x", celestial.x] }, 2] },
              { $pow: [{ $subtract: ["$y", celestial.y] }, 2] },
              { $pow: [{ $subtract: ["$z", celestial.z] }, 2] },
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
