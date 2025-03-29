import type { IESIKillmail } from "~/server/interfaces/IESIKillmail";
import { KillmailsESI } from "~/server/models/KillmailsESI";

export default defineEventHandler(async (event) => {
  const killmail_id = event.context.params?.id;
  const killmail: IESIKillmail | null = await KillmailsESI.findOne(
    { killmail_id: killmail_id },
    { _id: 0 },
  );

  return killmail;
});
