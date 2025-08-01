# Thessia Build System

This project uses a consolidated build system in `build.ts` that handles all build-related tasks.

## Features

- **Loader Generation**: Auto-generates TypeScript loader files for console commands, cron jobs, and queue jobs
- **Binary Building**: Creates optimized standalone binaries using esbuild
- **Asset Processing**: Downloads and modifies Cloudflare beacon script
- **Documentation**: Copies docs to build output for API access
- **Nuxt Integration**: Integrated with Nuxt.js build hooks for seamless development

## Commands

### Development
```bash
# Generate all loader files (CLI, Cron, Queue)
bun run build:loaders

# Build individual binaries
bun run build:cli
bun run build:cron
bun run build:queue

# Build everything
bun run build
```

### Direct Usage
```bash
# Generate loaders only
bun run build.ts loaders

# Build specific binary
bun run build.ts cli
bun run build.ts cron
bun run build.ts queue

# Build all binaries
bun run build.ts all
```

## Output Structure

```
.output/
├── cli/
│   ├── console.js      # CLI binary
│   └── package.json    # Runtime dependencies
├── cron/
│   ├── cron.js         # Cron binary
│   └── package.json    # Runtime dependencies
├── queue/
│   ├── queue.js        # Queue binary
│   └── package.json    # Runtime dependencies
└── public/
    └── _ca/
        └── cloudflare-beacon.js  # Modified Cloudflare script
```

## Loader Files

The build system automatically generates loader files that import all modules:

- `console/.loader.ts` - Exports all CLI commands
- `cron/.loader.ts` - Exports all cron jobs
- `queue/.loader.ts` - Exports all queue jobs

These are generated automatically before builds and during development.

## Configuration

Build configuration is centralized in the `BuildConfig` interface in `build.ts`:

- **External modules**: Node.js built-ins that should not be bundled
- **Package dependencies**: Runtime dependencies for binaries
- **Project paths**: Root directory and output locations

## Integration

The build system integrates with Nuxt.js through hooks:

- `build:before` - Generates loaders before build
- `app:resolve` - Generates loaders on dev server start
- `nitro:build:public-assets` - Processes Cloudflare beacon and copies docs
