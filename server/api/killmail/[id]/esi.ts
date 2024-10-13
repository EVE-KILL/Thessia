import { KillmailsESI } from "../../../models/KillmailsESI";

export default defineEventHandler(async (event) => {
  let killmail_id = event.context.params?.id;
  let killmail: IESIKillmail | null = await KillmailsESI.findOne(
    { killmail_id: killmail_id },
    { _id: 0 }
  );

  return killmail;
});
