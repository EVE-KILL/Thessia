import { Killmails } from "../../../models/Killmails";
import type { IKillmail } from "../../../interfaces/IKillmail";

export default defineEventHandler(async (event) => {
  const killmail_id = event.context.params?.id;
  const killmail: IKillmail | null = await Killmails.findOne(
    { killmail_id: killmail_id },
    { _id: 0 },
    { hint: "killmail_id_-1_killmail_hash_-1" },
  );

  return killmail || { error: "Killmail not found" };
});
