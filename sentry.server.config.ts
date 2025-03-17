import * as Sentry from '@sentry/nuxt';


if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    debug: process.env.NODE_ENV !== 'production',
    integrations: [
      Sentry.mongooseIntegration(),
      Sentry.redisIntegration(),
    ]
  });
}
