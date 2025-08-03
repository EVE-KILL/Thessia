# Build stage
FROM oven/bun:alpine AS builder
WORKDIR /build

# Copy source files
COPY . .

# Install dependencies and build
RUN bun install
RUN bun run build --standalone

# Production stage
FROM oven/bun:alpine
WORKDIR /app

# Copy only the built application from builder stage
COPY --from=builder /build/.output /app

# Create bin directory with executable scripts
RUN mkdir -p /app/bin
COPY ./bin/console ./bin/cron ./bin/queue /app/bin/
RUN \
    chmod +x /app/bin/* && \
    ln -s /app/server/node_modules /app/cli/node_modules && \
    ln -s /app/server/node_modules /app/cron/node_modules && \
    ln -s /app/server/node_modules /app/queue/node_modules && \
    ln -s /app/server/node_modules /app/websocket/node_modules

WORKDIR /app

ENV PATH="/app/bin:${PATH}"
ENV THESSIA_CONTAINER=true

# Expose the application port
EXPOSE 3000

# Start the application
CMD [ "bun", "--bun", "run", "/app/server/index.mjs" ]
