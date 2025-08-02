# Copilot Instructions

## Project Overview

This project uses:

-   **Nuxt (Vue 3 & Nitro)** for frontend and backend.
-   **Nuxt/UI** for UI components. (AVOID Using Nuxt/UI components as much as possible, use the components located in the `/app/components` folder instead (like instead of `UTable` use `Table`from `/app/components/common/Table.vue`))
-   **MongoDB (via Mongoose)** for data storage.
-   **Redis (via ioredis)** for caching.
-   **BullMQ** for job processing.

## Project Structure

-   **API:** `/server/api`
-   **Nitro Routes:** `/server/routes`
-   **Vue Pages:** `/app/pages`
-   **MongoDB Models:** `/server/models`
-   **Queues:** `/src/queue`
-   **Cron Jobs:** `/src/cron`
-   **Console Commands:** `/src/console`
-   **i18n Files:** `/i18n/locales`

## Code Conventions

-   Follow **TypeScript** best practices.
-   Structure Vue components modularly.
-   Use composition API with `<script setup lang="ts">` syntax.
-   Prefer typed refs and reactive objects.
-   Use kebab-case for file names and component names.
-   Use PascalCase for component imports and registrations.
-   Use camelCase for variables, functions, and properties.
-   Use UPPER_SNAKE_CASE for constants.
-   Include JSDoc comments for public functions and types.
-   Organize imports by: built-in modules, external modules, internal modules.

## Internationalization

-   Use `t('key')` in composables with `useI18n()` hook
-   Organize translations by feature area
-   Include all user-facing strings in english translation, located at `i18n/locales/en.json`
-   Support locale fallbacks

## Icons

-   Use **Lucide Icons** for all icons.
-   Use **Simple Icons** for SVG icons.

## Nitro API Best Practices

-   **Query Parameters**: Use `getQuery(event)` to access URL query parameters (e.g., `?filters=...&page=1`)
-   **Route Parameters**: Use `event.context.params?.id` to access dynamic route parameters (e.g., `/killmail/[id]/esi.get.ts`)
-   **Cache Keys**: In `defineCachedEventHandler`, use the `getKey: (event) => { ... }` function with `getQuery(event)` for query params and `event.context.params` for route params
-   **Never** manually parse URLs with `url.parse(event.node.req.url)` - use the proper Nitro helpers instead

## Data Fetching Best Practices

-   **Prefer `useAsyncData` over `useFetch`** for better SSR control and loading state management
-   **Always use `lazy: true`** in useAsyncData options to prevent blocking initial render
-   **Set `server: false`** for client-side only data fetching (useful for filtered/search data)
-   **Use `watch` property** to automatically refetch when dependencies change (e.g., `watch: [apiEndpoint]`)
-   **Use the `pending` state** from useAsyncData instead of manual loading state management
-   **Avoid manual timeout logic** - let useAsyncData handle loading states naturally
-   **Structure for immediate rendering** with fallback data or skeleton states
-   **Use computed API endpoints** that react to filter changes for dynamic data fetching
-   **Handle errors** with the `error` state returned from useAsyncData
-   **Use `refresh()` function** for manual data refetching instead of re-calling $fetch

Example pattern:

```vue
const { data, pending, error, refresh } = useAsyncData('unique-key', () =>
$fetch(apiEndpoint.value), { lazy: true, server: false, watch: [apiEndpoint] }
);
```

## Copilot-Specific Instructions

-   Follow project structure and conventions.
-   Use `useFetch` or `useAsyncData` for API calls. (Prefer `useAsyncData` for SSR control)
-   Handle errors with try-catch blocks.
-   Use `cliLogger` for logging. (cliLogger.info('message') for example)
-   Implement proper TypeScript typing for all functions and variables.
-   Follow the single responsibility principle.
-   Utilize existing composables and utilities before creating new ones.
-   Always consider internationalization for user-facing strings.
-   Include appropriate error handling for async operations.
-   Consider performance implications, especially with MongoDB queries.
-   Use proper index definitions when querying MongoDB.
-   As much as possible use the components located in the `/app/components` folder.
-   Use the `useI18n` composable for translations.
-   As much as possible, implement SEO using useSeoMeta
-   Never omit code and leave behind `Existing Code` comments.
-   Always use `async/await` for asynchronous operations.
-   Components, utils, composables, helpers, models, interfaces and more are all automatically imported, so you can use them directly without needing to import them manually.
-   If the folder exists, you can use it as reference - but DO NOT do so without permission, and ask permission first. The folder in question is called `/oldfrontend`.
-   If you are unsure about a specific implementation, ask for clarification.
