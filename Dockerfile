FROM oven/bun:latest AS build
WORKDIR /app
COPY . /app
COPY ./.output /app/.output

EXPOSE 3000
CMD [ "bun", "--bun", "run", "--cwd", "/app", ".output/server/index.mjs" ]
