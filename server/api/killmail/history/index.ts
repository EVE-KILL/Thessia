import { Killmails } from "../../../models/Killmails";
import { Killmail } from "../../../../types/IKillmail";

export default defineEventHandler(async () => {
  const oldestKillmail: Killmail | null = await Killmails.findOne({}, { _id: 0, kill_time: 1 }, { sort: { kill_time: 1 } }).hint({ kill_time: -1 });
  const newestKillmail: Killmail | null = await Killmails.findOne({}, { _id: 0, kill_time: 1 }, { sort: { kill_time: -1 } }).hint({ kill_time: -1 });

  if (oldestKillmail && newestKillmail) {
    const startDate = new Date(oldestKillmail.kill_time);
    const endDate = new Date(newestKillmail.kill_time);
    const uniqueDates = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      uniqueDates.push(d.toISOString().split('T')[0].replace(/-/g, ''));
    }

    return uniqueDates;
  }

  return [];
});

