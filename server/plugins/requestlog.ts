import { nitroApp } from "nitropack/runtime/internal/app";
import { cliLogger } from "~/server/helpers/Logger";

export default defineNitroPlugin(() => {
  nitroApp.hooks.hook("request", (event) => {
    const requestIp = getRequestIP(event, { xForwardedFor: true });

    // Output request log info similar to nginx
    cliLogger.info(
      `[${new Date().toISOString()} "${event.node.req.method} ${event.node.req.url} HTTP/${event.node.req.httpVersion}" ${event.node.req.headers["user-agent"]} ${requestIp}]`,
    );
  });
});
