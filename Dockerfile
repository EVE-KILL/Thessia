FROM oven/bun:latest AS build
WORKDIR /app
COPY . /app

RUN \
    bun install && \
    bun run build --standalone

FROM oven/bun:latest AS production
WORKDIR /app
COPY --from=build /app/.output /app/
COPY --from=build /app/nuxt.config.ts /app/

EXPOSE 3000
CMD [ "bun", "--bun", "run", "/app/server/index.mjs" ]
