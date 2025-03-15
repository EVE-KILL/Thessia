import * as Sentry from "@sentry/bun";

export default defineNitroPlugin(() => {
  // If we are bun, we can use Sentry
  if (process.versions.bun === undefined) {
    return;
  }

  if (process.env.SENTRY_DSN === undefined) {
    return;
  }

  console.log("✔ Sentry initialized");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
});
