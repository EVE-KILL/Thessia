import { Killmails } from "../../../models/Killmails";

export default defineEventHandler(async (event) => {
  let killmail_id = event.context.params?.id;
  let killmail: IKillmail | null = await Killmails.findOne(
    { killmail_id: killmail_id },
    { _id: 0 }
  );
  return killmail;
});
