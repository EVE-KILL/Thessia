import { Killmails } from "../../../models/Killmails";
import { Killmail } from "../../../../types/IKillmail";

export default defineEventHandler(async (event) => {
  let killmail_id = event.context.params?.id;
  let killmail: Killmail | null = await Killmails.findOne(
    { killmail_id: killmail_id },
    { _id: 0 }
  );
  return killmail;
});
