# Repository Guidelines

## Project Structure & Module Organization

- Application entry lives under `app/` and `nuxt.config.ts`; UI assets in `public/` and Tailwind settings in `tailwind.config.js`.
- Server routes and API handlers sit in `server/`; shared logic and data helpers live in `lib/`.
- Domain-specific packages: `cron/` (scheduled jobs), `queue/` (BullMQ workers), `console/` (CLI utilities), `websockets/` (realtime).
- Data and schema assets: `prisma/` for database models and migrations; `i18n/` for locale files; `docs/` for user-facing docs; container setups in `docker-compose*.yml` and `Dockerfile`.

## Build, Test, and Development Commands

- `bun run dev` — start Nuxt in dev mode at http://localhost:3000.
- `bun run debug` — dev server with inspector enabled for debugging.
- `bun run build` — production build (Nuxt + custom builders for CLI/cron/queue). Use `bun run fastbuild` when you only need the Nuxt app.
- Targeted builds: `bun run build:cli`, `bun run build:cron`, `bun run build:queue`, `bun run build:loaders` if you are iterating on those packages.
- `bun run preview` — serve the production build locally. `bun run generate` for static output if needed.

## Coding Style & Naming Conventions

- Language: TypeScript-first; prefer ESM imports. Two-space indentation; keep lines focused and small, descriptive function names.
- Linting/formatting: `bun run lint` (Biome) and `bun run lint:fix` for autofix. Run before pushing.
- Files close to their domain (e.g., API route tests next to handlers). Names use kebab-case for routes, camelCase for variables/functions, PascalCase for types/components.

## Testing Guidelines

- Add Bun tests colocated with the code using `*.test.ts` (API route tests currently live in `server/api/**/test*.ts`).
- Prefer fast, deterministic unit tests for `lib/` utilities; integration checks for API handlers and queue/cron workers.
- Run `bun test` (or `bun test path/to/file.test.ts`) before opening a PR; target key paths when adding features that touch persistence, caching, or message queues.

## Commit & Pull Request Guidelines

- Commits: short, present-tense summaries (e.g., `Add killmail resolver`, `Harden ESI token handling`). Group related changes; avoid noisy churn.
- Pull requests: include what changed, why, and how to verify. Link issues if applicable; add screenshots/GIFs for UI changes and mention any config or migration steps.
- Ensure linters and relevant tests pass; call out coverage gaps or remaining risks in the PR description.

## Security & Configuration Tips

- Keep secrets in `.env` (root). Do not commit credentials; prefer environment-specific overrides for production.
- Redis, MongoDB, and Meilisearch endpoints ship with permissive defaults—lock down ports in real deployments and rotate keys used for ESI and Discord hooks.
- When touching queues or cron jobs, verify retry/backoff settings and ensure new jobs are idempotent.***
