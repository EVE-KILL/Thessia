import { cliLogger } from "~/server/helpers/Logger";

export default defineEventHandler(async (event) => {
  const identifier = event.context.params?.identifier;

  cliLogger.debug(String(identifier));

  return {};
});
