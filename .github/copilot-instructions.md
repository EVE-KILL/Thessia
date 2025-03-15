# Copilot Instructions

## Project Overview
This project uses:

- **Nuxt (Vue 3 & Nitro)** for frontend and backend.
- **MongoDB (via Mongoose)** for data storage.
- **Redis (via ioredis)** for caching.
- **BullMQ** for job processing.

## Project Structure

- **API:** `/server/api`
- **Nitro Routes:** `/server/routes`
- **Vue Pages:** `/pages`
- **MongoDB Models:** `/server/models`
- **Queues:** `/queue`
- **Cron Jobs:** `/cron`
- **Console Commands:** `/console`
- **i18n Files:** `/i18n/locales`

## Code Conventions

- Use **Biome** for formatting.
- Follow **TypeScript** best practices.
- Use **ESLint** for linting.
- Structure Vue components modularly.
- Use composition API with `<script setup>` syntax.
- Prefer typed refs and reactive objects.
- Use kebab-case for file names and component names.
- Use PascalCase for component imports and registrations.
- Use camelCase for variables, functions, and properties.
- Use UPPER_SNAKE_CASE for constants.
- Include JSDoc comments for public functions and types.
- Organize imports by: built-in modules, external modules, internal modules.

## Common Patterns

### API Calls
```ts
// Use useFetch for API calls with proper typing
const { data, error, pending, refresh } = await useFetch<ApiResponse>('/api/endpoint', {
  method: 'POST',
  body: payload,
  onResponseError: (error) => {
    console.error('API error:', error);
    // Handle error appropriately
  }
});
```

### Error Handling
```ts
try {
  // Operation that might fail
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.debug('Error in operation:', error);
  throw createError({
    statusCode: 500,
    statusMessage: 'Operation failed',
    data: { context: 'Additional context' }
  });
}
```

### MongoDB Model Pattern
```ts
// server/models/example.model.ts
import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';

export interface IExample extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String }
  },
  { timestamps: true }
);

// Add any methods here
schema.methods.someMethod = function() {
  // Method implementation
};

// Add any statics here
schema.statics.findByName = function(name: string) {
  return this.findOne({ name });
};

export const Example: Model<IExample> = mongoose.model<IExample>('Example', schema);
```

## Vue Component Template
```vue
<template>
  <div class="component-container">
    <h1>{{ $t('component.title') }}</h1>
    <div v-if="loading">{{ $t('common.loading') }}</div>
    <div v-else-if="error">{{ $t('common.error') }}</div>
    <div v-else>
      <!-- Component content -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { PropType } from 'vue';

// Props
const props = defineProps({
  id: {
    type: String as PropType<string>,
    required: true
  }
});

// Emits
const emit = defineEmits<{
  (e: 'update', value: string): void
}>();

// State
const loading = ref(false);
const error = ref<Error | null>(null);
const data = ref<any>(null);

// Computed
const isDataValid = computed(() => !!data.value && data.value.length > 0);

// Methods
const fetchData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const { data: result } = await useFetch(`/api/endpoint/${props.id}`);
    data.value = result.value;
  } catch (err) {
    console.debug('Error fetching data:', err);
    error.value = err as Error;
  } finally {
    loading.value = false;
  }
};

// Lifecycle
onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.component-container {
  /* Component styling */
}
</style>
```

## Example Templates

- **Queue Job**
  ```js
  export default {
    name: "queue-name",
    description: "Short queue description",
    run: () => {
      // Queue job implementation
    }
  };
  ```

- **Cron Job**
  ```js
  export default {
    name: "cron-name",
    description: "Short cron description",
    schedule: "0 0 * * *",
    run: async () => {
      // Cron job implementation
    },
  };
  ```

- **Console Command**
  ```js
  export default {
    name: "command-name",
    description: "Short command description",
    longRunning: false,
    run: async () => {
      // Command implementation
      return { response: "Command completed" };
    },
  };
  ```

- **API Endpoint**
  ```ts
  // server/api/resource/[id].ts
  export default defineEventHandler(async (event) => {
    try {
      const id = getRouterParam(event, 'id');
      const query = getQuery(event);

      // For POST/PUT/PATCH requests
      const body = await readBody(event);

      // Implementation
      const result = await someOperation(id, query, body);

      return result;
    } catch (error) {
      console.debug('API error:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to process request',
        data: error
      });
    }
  });
  ```

- **Composable**
  ```ts
  // composables/useFeature.ts
  export function useFeature() {
    const state = ref({});
    const loading = ref(false);
    const error = ref(null);

    const fetchData = async () => {
      // Implementation
    };

    const processData = (data) => {
      // Implementation
    };

    return {
      state,
      loading,
      error,
      fetchData,
      processData
    };
  }
  ```

## Testing Strategy

- Use **Vitest** for unit tests
- Use **Cypress** for end-to-end tests
- Place unit tests next to the files they test with `.spec.ts` or `.test.ts` suffix
- Focus on testing business logic and complex operations
- Mock external dependencies when testing components or services

## Internationalization

- Use `$t('key')` for translations in Vue templates
- Use `t('key')` in composables with `useI18n()` hook
- Organize translations by feature area
- Include all user-facing strings in translation files
- Support locale fallbacks

## Copilot-Specific Instructions

- Follow project structure and conventions.
- Use `useFetch` or `useAsyncData` for API calls.
- Handle errors with try-catch blocks.
- Use `console.debug` for logging.
- Avoid exposing sensitive data.
- Implement proper TypeScript typing for all functions and variables.
- Follow the single responsibility principle.
- Utilize existing composables and utilities before creating new ones.
- Always consider internationalization for user-facing strings.
- Include appropriate error handling for async operations.
- Consider performance implications, especially with MongoDB queries.
- Use proper index definitions when querying MongoDB.
- Implement proper caching strategies when appropriate.
- Ensure queue jobs are idempotent when possible.
- Follow RESTful principles for API endpoints.
