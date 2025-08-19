import chalk from "chalk";
import { format } from "date-fns";

export const cliLogger = {
    info: (msg: string) => {
        const timestamp = chalk.green(
            format(new Date(), "yyyy-MM-dd HH:mm:ss")
        );
        console.log(`${timestamp} ${chalk.green("[INFO]")} ${msg}`);
    },
    warn: (msg: string) => {
        const timestamp = chalk.green(
            format(new Date(), "yyyy-MM-dd HH:mm:ss")
        );
        console.warn(`${timestamp} ${chalk.yellow("[WARN]")} ${msg}`);
    },
    error: (msg: string) => {
        const timestamp = chalk.green(
            format(new Date(), "yyyy-MM-dd HH:mm:ss")
        );
        console.error(`${timestamp} ${chalk.red("[ERROR]")} ${msg}`);
    },
    debug: (msg: string) => {
        const timestamp = chalk.green(
            format(new Date(), "yyyy-MM-dd HH:mm:ss")
        );
        console.debug(`${timestamp} ${chalk.blue("[DEBUG]")} ${msg}`);
    },
};
