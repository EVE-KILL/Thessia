import { KillmailsESI } from "../../../models/KillmailsESI";
import { ESIKillmail } from "../../../../types/IESIKillmail";

export default defineEventHandler(async (event) => {
  const killmail_id = event.context.params?.id;
  const killmail: ESIKillmail | null = await KillmailsESI.findOne(
    { killmail_id: killmail_id },
    { _id: 0 },
  );

  return killmail;
});