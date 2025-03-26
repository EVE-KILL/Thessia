# Copilot Instructions

## Project Overview

This project uses:

- **Nuxt (Vue 3 & Nitro)** for frontend and backend.
- **Nuxt/UI** for UI components.
- **MongoDB (via Mongoose)** for data storage.
- **Redis (via ioredis)** for caching.
- **BullMQ** for job processing.

## Project Structure

- **API:** `/server/api`
- **Nitro Routes:** `/server/routes`
- **Vue Pages:** `/src/theme/modern/pages`
- **MongoDB Models:** `/server/models`
- **Queues:** `/src/queue`
- **Cron Jobs:** `/src/cron`
- **Console Commands:** `/src/console`
- **i18n Files:** `/i18n/locales`

## Code Conventions

- Follow **TypeScript** best practices.
- Structure Vue components modularly.
- Use composition API with `<script setup lang="ts">` syntax.
- Prefer typed refs and reactive objects.
- Use kebab-case for file names and component names.
- Use PascalCase for component imports and registrations.
- Use camelCase for variables, functions, and properties.
- Use UPPER_SNAKE_CASE for constants.
- Include JSDoc comments for public functions and types.
- Organize imports by: built-in modules, external modules, internal modules.

## Internationalization

- Use `t('key')` in composables with `useI18n()` hook
- Organize translations by feature area
- Include all user-facing strings in english translation, located at `i18n/locales/en.json`
- Support locale fallbacks

## Icons

- Use **Lucide Icons** for all icons.
- Use **Simple Icons** for SVG icons.

## Copilot-Specific Instructions

- Follow project structure and conventions.
- Use `useFetch` or `useAsyncData` for API calls.
- Handle errors with try-catch blocks.
- Use `console.debug` for logging.
- Implement proper TypeScript typing for all functions and variables.
- Follow the single responsibility principle.
- Utilize existing composables and utilities before creating new ones.
- Always consider internationalization for user-facing strings.
- Include appropriate error handling for async operations.
- Consider performance implications, especially with MongoDB queries.
- Use proper index definitions when querying MongoDB.
- As much as possible use the components located in the `/src/theme/modern/components` folder.
- Use the `useI18n` composable for translations.
- As much as possible, implement SEO using useSeoMeta
