# Frontend Documentation

This section details the frontend architecture, components, and development practices for the Thessia application.

## Overview

Thessia's frontend is built with modern Vue.js 3 and Nuxt, providing a reactive, SSR-compatible user interface with comprehensive state management through Pinia.

## Documentation Sections

### State Management

- **[State Management Guide](./state-management.md)** - Comprehensive guide to Pinia stores, authentication, and user settings
- **[Auth Quick Reference](./auth-quick-reference.md)** - Quick reference for authentication patterns and user settings usage

### Real-time Features

- **[WebSocket System](./websocket-system.md)** - Real-time communication, notifications, and live updates

### Component Development

- **[Search Component Examples](./search-component-examples.md)** - Standardized search functionality patterns

## Key Technologies

- **Vue.js 3** - Progressive JavaScript framework with Composition API
- **Nuxt** - Full-stack Vue framework with SSR/SSG capabilities
- **Pinia** - Type-safe state management for Vue
- **TypeScript** - Static type checking and enhanced developer experience
- **Nuxt/UI** - Component library (with custom component overrides)
- **Tailwind CSS** - Utility-first CSS framework

## Architecture Principles

### SSR-First Design

- Server-side rendering for better SEO and initial load performance
- Client-side hydration safety with proper guards
- Progressive enhancement for JavaScript-dependent features

### Type Safety

- Full TypeScript integration across components and stores
- Auto-generated types for API responses
- Strict type checking for props and events

### Modular Components

- Reusable component library in `/app/components`
- Consistent design patterns and styling
- Auto-imported composables and utilities

### Reactive State Management

- Centralized state with Pinia stores
- Reactive authentication and user settings
- Real-time updates via WebSocket integration

## Getting Started

1. **Authentication System**: Start with the [Auth Quick Reference](./auth-quick-reference.md) for common patterns
2. **State Management**: Read the [State Management Guide](./state-management.md) for comprehensive store usage
3. **Real-time Features**: Check [WebSocket System](./websocket-system.md) for live updates implementation

## Development Guidelines

### Component Structure

```vue
<template>
    <!-- Template with proper accessibility -->
</template>

<script setup lang="ts">
// Composition API with TypeScript
// Auto-imported composables and stores
</script>

<style scoped>
/* Scoped styles with Tailwind utilities */
/* No @apply directives (not supported) */
</style>
```

### Best Practices

- Use `<script setup lang="ts">` syntax for all components
- Implement proper TypeScript typing for props and emits
- Include JSDoc comments for complex logic
- Use auto-imported stores and composables
- Follow SSR-safety guidelines with client-side guards
- Implement proper error handling and loading states

For specific implementation patterns and examples, refer to the individual documentation sections above.
