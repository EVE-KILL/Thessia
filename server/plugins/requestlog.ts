import chalk from "chalk";
import { nitroApp } from "nitropack/runtime/internal/app";
import { cliLogger } from "~/server/helpers/Logger";

export default defineNitroPlugin(() => {
    nitroApp.hooks.hook("request", (event) => {
        const requestIp = getRequestIP(event, { xForwardedFor: true });

        // Output request log info similar to nginx but with colors
        cliLogger.info(
            `${chalk.cyan(event.node.req.method)} ${chalk.white(
                event.node.req.url
            )} ${chalk.gray(
                `HTTP/${event.node.req.httpVersion}`
            )} ${chalk.yellow(
                event.node.req.headers["user-agent"]
            )} ${chalk.magenta(`[${requestIp}]`)}`
        );
    });
});
