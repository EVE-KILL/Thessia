# Use the Bun runtime as the base image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy the application code into the container
COPY . .

# Install dependencies and build the application
RUN bun install
RUN bun run build

# Expose the necessary port for the application
EXPOSE 3000

# Start the application
CMD ["bun", "run", "start"]
