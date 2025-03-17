FROM oven/bun:latest AS build
WORKDIR /app
COPY . /app

RUN \
    bun install && \
    bun run build

EXPOSE 3000
CMD [ "bun", "--bun", "run", "/app/.output/server/index.mjs" ]
