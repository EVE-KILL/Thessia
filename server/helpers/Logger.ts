import chalk from 'chalk';
import moment from 'moment';

export const cliLogger = {
    info: (msg: string) => {
        const timestamp = chalk.green(moment().format('YYYY-MM-DD HH:mm:ss'));
        console.log(`${timestamp} ${chalk.green('[INFO]')} ${msg}`);
    },
    warn: (msg: string) => {
        const timestamp = chalk.green(moment().format('YYYY-MM-DD HH:mm:ss'));
        console.warn(`${timestamp} ${chalk.yellow('[WARN]')} ${msg}`);
    },
    error: (msg: string) => {
        const timestamp = chalk.green(moment().format('YYYY-MM-DD HH:mm:ss'));
        console.error(`${timestamp} ${chalk.red('[ERROR]')} ${msg}`);
    },
    debug: (msg: string) => {
        const timestamp = chalk.green(moment().format('YYYY-MM-DD HH:mm:ss'));
        console.debug(`${timestamp} ${chalk.blue('[DEBUG]')} ${msg}`);
    },
};
