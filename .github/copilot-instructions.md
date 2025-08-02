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
-   Use the **common Image component** for EVE Online related images (character portraits, corporation logos, alliance logos, item icons, ship renders, etc.)
    -   Use `type="character"` for character portraits
    -   Use `type="corporation"` for corporation logos
    -   Use `type="alliance"` for alliance logos
    -   Use `type="type-icon"` for item/ship icons
    -   Use `type="type-render"` for ship renders
    -   Pass the appropriate ID and size props

## Currency and ISK Formatting

-   Use the **formatIsk utility** for displaying ISK values in the UI
-   The utility automatically formats large numbers with B/M/K suffixes
-   Import is automatic due to auto-imports configuration
-   Use regular number inputs for form fields, but display formatted values in tables and readonly contexts

## CSS and Styling

-   **NEVER use Tailwind CSS `@apply` directives** - they are not supported in this project
-   Use regular CSS properties instead of `@apply` directives
-   Use `:global(.dark)` selectors for dark mode styling instead of `dark:` prefixes
-   Structure CSS with proper classes and regular CSS syntax
-   Use CSS custom properties for theming when needed
-   Prefer scoped styles with `<style scoped>` in Vue components

Example of **INCORRECT** styling:

```css
.my-class {
    @apply flex items-center gap-2 px-4 py-2; /* ❌ DON'T DO THIS */
}
```

Example of **CORRECT** styling:

```css
.my-class {
    display: flex; /* ✅ Use regular CSS */
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
}

:global(.dark) .my-class {
    background-color: #374151; /* ✅ Dark mode with :global */
}
```

## Documentation

The project includes comprehensive documentation in the `/docs` folder that should be referenced for implementation guidance:

-   **Frontend Documentation**: `/docs/frontend/` - Contains implementation examples and patterns
    -   **Search Components**: `/docs/frontend/search-component-examples.md` - Complete implementation guide for search functionality with standardized styling and API patterns
    -   Component usage examples, styling guidelines, and best practices
-   **Backend Documentation**: `/docs/backend/` - API design patterns and database schemas
-   **Installation & Development**: `/docs/installation/` and `/docs/development/` - Setup and development workflows
-   **API Documentation**: `/docs/api/` - Endpoint specifications and usage examples

**Always check the documentation before implementing new features** - it contains:

-   Proven implementation patterns
-   Standardized styling guidelines
-   API integration examples
-   Troubleshooting guides
-   Best practices and conventions

When implementing components like search functionality, data tables, forms, or other common patterns, reference the relevant documentation to ensure consistency with established patterns and avoid reinventing solutions.

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

## Security and CSP Compliance

-   **Content Security Policy**: The project has strict CSP headers configured in `nuxt.config.ts`
-   **External Website Calls**: When adding external API calls, image sources, or script sources to frontend code (`/app`), verify they are allowed in the CSP configuration
-   **Image Sources**: The CSP `img-src` policy allows:
    -   EVE Online assets: `images.evetech.net`, `images.eve-kill.com`
    -   Reddit images: `i.redd.it`, `preview.redd.it`
    -   Imgur images: `i.imgur.com`
    -   **All HTTPS images**: `https:` - This allows user-generated content from Imgur, Giphy, Tenor, and any other HTTPS image hosting service
-   **User-Generated Content**: The KillComments component allows users to post images from various sources (Imgur, Giphy, Tenor, or any HTTPS URL), which is supported by the current CSP policy
-   **Allowed Domains**: Currently approved domains include:
    -   Images: `images.evetech.net`, `images.eve-kill.com`, `i.redd.it`, `i.imgur.com`, `preview.redd.it`, and **all HTTPS sources**
    -   Connections: `images.evetech.net`, WebSocket connections to `eve-kill.com`
    -   Scripts: Cloudflare challenges, blob URLs for web workers
-   **Adding New Domains**: If new external domains are needed for non-image resources, update the CSP configuration in `nuxt.config.ts` under `security.headers.contentSecurityPolicy`
-   **CSP Violations**: Any external resource not in the CSP will be blocked by the browser in production

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
