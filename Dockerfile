FROM oven/bun:alpine AS build
WORKDIR /app
COPY . /app

RUN \
    bun install && \
    bun run build --standalone

FROM oven/bun:alpine AS production
WORKDIR /app
COPY --from=build /app/.output /app/
COPY --from=build /app/nuxt.config.ts /app/

EXPOSE 3000
CMD [ "bun", "--bun", "run", "--cwd", "/app", "server/index.mjs" ]
