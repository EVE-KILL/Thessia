export const cliLogger = {
  info: (msg: string) => console.log(`\x1b[32m[INFO]\x1b[0m ${msg}`),
  warn: (msg: string) => console.warn(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg: string) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  debug: (msg: string) => console.debug(`\x1b[34m[DEBUG]\x1b[0m ${msg}`),
};
