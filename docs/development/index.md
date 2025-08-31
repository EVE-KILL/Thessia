# Development Documentation

This section contains documentation for developers working on the Thessia project.

## Getting Started

- [Development Guide](./development-guide.md) - Complete guide for setting up and developing Thessia
- [Build System](./build-system.md) - Understanding the consolidated build infrastructure
- [User Settings Guide](./user-settings-guide.md) - How to add and manage user settings
- [Admin Panel Guide](./admin-panel-guide.md) - How to add new admin panels to the admin interface

## Development Workflow

### Prerequisites
- Bun runtime
- MongoDB
- Redis
- Node.js 18+ (for some tools)

### Quick Start
```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

## Architecture

Thessia uses a modern TypeScript stack:

- **Frontend**: Nuxt with Vue and Nitro
- **Backend**: Nitro server with MongoDB and Redis
- **Build System**: Consolidated esbuild-based system for CLI, Cron, and Queue binaries
- **Job Processing**: BullMQ for background jobs
- **Internationalization**: Vue i18n with Transifex integration

## Documentation Structure

```
docs/
├── development/          # Development documentation
│   ├── index.md         # This file
│   ├── development-guide.md     # Complete development setup
│   ├── build-system.md         # Build system documentation
│   └── user-settings-guide.md  # User settings implementation guide
├── api/                 # API documentation
├── backend/             # Backend-specific docs
├── frontend/            # Frontend-specific docs
└── installation/        # Installation and deployment
```

## Contributing

Please refer to the [Development Guide](./development-guide.md) for detailed information about:

- Project structure
- Coding conventions
- Testing procedures
- Deployment processes
- Contribution guidelines
