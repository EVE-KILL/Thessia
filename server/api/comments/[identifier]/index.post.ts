import { cliLogger } from "~/server/helpers/Logger";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  cliLogger.debug(JSON.stringify(body));

  return {};
});
