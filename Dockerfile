FROM oven/bun:latest
WORKDIR /app
COPY . /app

EXPOSE 3000
CMD [ "bun", "--bun", "run", "--cwd", "/app", ".output/server/index.mjs" ]
