FROM oven/bun:latest AS build
WORKDIR /app
COPY . /app

RUN \
    bun install && \
    bun run build --standalone

#FROM oven/bun:alpine AS production
#WORKDIR /app
#COPY --from=build /app/.output /app/build/
#COPY --from=build /app/nuxt.config.ts /app/
#COPY --from=build /app/bin /app/bin
#COPY --from=build /app/console /app/console
#COPY --from=build /app/queue /app/queue
#COPY --from=build /app/cron /app/cron

EXPOSE 3000
#CMD [ "bun", "--bun", "run", "--cwd", "/app", "server/index.mjs" ]
CMD [ "bun", "--bun", "run", "--cwd", "/app", ".output/server/index.mjs" ]
