# Development Guide

This guide covers the development workflow, coding standards, and best practices for contributing to Thessia.

## 🛠️ Development Setup

## Prerequisites

Either having MongoDB, Redis and Meilisearch already installed and available to be used
Or have Docker / Docker for Windows / Docker for Mac installed to run the development environment.

## Docker

```bash
# Full development environment
docker compose up -d

# Individual services
docker compose up -d mongodb redis meilisearch

# View logs
docker compose logs -f

# Rebuild and restart
docker compose up -d --build
```

## .env

Copy the .env-example to .env and adjust the values as needed. This file is used to configure the application.

```bash
cp .env-example .env
```

By default it points at 127.0.0.1 for MongoDB, Redis and Meilisearch. Which is also where the docker-compose will expose them by default.

### Development Environment

```bash
# Clone and setup (if not done already)
git clone https://github.com/EVE-KILL/Thessia.git
cd Thessia
bun install

# Start development server
bun run dev

# Development server with debugging
bun run debug
```

The application will be available at:

- **Frontend**: `http://localhost:3000`
- **API**: `http://localhost:3000/api/*`
- **Admin**: `http://localhost:3000/admin` (if applicable)

## 🏗️ Project Structure

Understanding the project structure is crucial for effective development:

```
Thessia/
├── docs/                    # Documentation files
├── i18n/                    # Internationalization
│   ├── i18n.config.ts
│   └── locales/
├── pages/                   # Nuxt pages (auto-routing)
├── server/                  # Server-side code
│   ├── api/                 # API endpoints
│   ├── models/              # MongoDB models
│   ├── helpers/             # Server utilities
│   └── plugins/             # Server plugins
├── shared/                  # Shared utilities
├── src/                     # Application source
│   ├── bot/                 # Discord bot
│   ├── console/             # CLI commands
│   ├── cron/                # Scheduled jobs
│   ├── queue/               # Job queue processors
│   └── theme/modern/        # Frontend theme
│       ├── components/      # Vue components
│       ├── composables/     # Vue composables
│       ├── layouts/         # Nuxt layouts
│       └── pages/           # Theme pages
├── app.vue                  # Main app component
├── nuxt.config.ts           # Nuxt configuration
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript config
```

## 💻 Development Commands

### Essential Commands

```bash
# Development
bun run dev                  # Start dev server
bun run debug               # Start with inspector
bun run build               # Build for production
bun run preview             # Preview production build

# Code Quality
bun run lint                # Run ESLint
bun run lint:fix            # Fix ESLint issues
bun run type-check          # TypeScript check

# Database & Jobs
bun run console             # CLI interface
bun run cron                # Cron job runner
bun run queue               # Queue processor
bun run bot                 # Discord bot

# Building Components
bun run build-cli           # Build CLI
bun run build-cron          # Build cron jobs
bun run build-queue         # Build queue processors
bun run build-bot           # Build Discord bot
```

## 📝 Coding Standards

### TypeScript Guidelines

#### Type Safety

```typescript
// ✅ Good: Explicit types
interface KillmailData {
    killmail_id: number;
    victim: {
        character_id?: number;
        corporation_id: number;
        alliance_id?: number;
    };
    attackers: Array<{
        character_id?: number;
        corporation_id?: number;
        damage_done: number;
    }>;
}

// ✅ Good: Proper error handling
async function fetchKillmail(id: number): Promise<KillmailData> {
    try {
        const response = await $fetch<KillmailData>(`/api/killmails/${id}`);
        return response;
    } catch (error) {
        console.error('Failed to fetch killmail:', error);
        throw new Error(`Killmail ${id} not found`);
    }
}

// ❌ Bad: Any types
function processData(data: any): any {
    return data.stuff;
}
```

#### Vue 3 Composition API

```vue
<script setup lang="ts">
// ✅ Good: Composition API with TypeScript
interface User {
    id: number;
    name: string;
    corporation: string;
}

const { data: user, pending, error } = await useFetch<User>('/api/user');
const isLoading = ref(false);

// ✅ Good: Computed properties with types
const displayName = computed(() =>
    user.value ? `${user.value.name} [${user.value.corporation}]` : 'Unknown'
);

// ✅ Good: Event handlers
const handleUserUpdate = async (userData: Partial<User>) => {
    isLoading.value = true;
    try {
        await $fetch('/api/user', {
            method: 'PUT',
            body: userData
        });
    } finally {
        isLoading.value = false;
    }
};
</script>
```

### File Naming Conventions

```bash
# Components (PascalCase)
UserProfile.vue
KillmailDetails.vue
CharacterSearch.vue

# Pages (kebab-case)
killmail-details.vue
character-profile.vue
corporation-overview.vue

# API routes (kebab-case)
/server/api/killmails/[id].get.ts
/server/api/characters/search.post.ts

# Models (PascalCase)
/server/models/Killmail.ts
/server/models/Character.ts

# Utilities (camelCase)
/server/helpers/dateUtils.ts
/shared/helpers/formatters.ts
```

### Code Organization

#### Component Structure

```vue
<template>
    <!-- Keep templates clean and readable -->
    <div class="component-container">
        <ComponentHeader :title="title" />
        <ComponentContent :data="processedData" />
        <ComponentFooter @action="handleAction" />
    </div>
</template>

<script setup lang="ts">
// 1. Imports (grouped)
import type { ComponentData } from '~/types';

// 2. Props/Emits
interface Props {
    title: string;
    data: ComponentData[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
    action: [id: number];
}>();

// 3. Composables
const { t } = useI18n();
const route = useRoute();

// 4. Reactive state
const isLoading = ref(false);

// 5. Computed properties
const processedData = computed(() =>
    props.data.map(item => ({
        ...item,
        formatted: formatData(item)
    }))
);

// 6. Methods
const handleAction = (id: number) => {
    emit('action', id);
};
</script>

<style scoped>
/* Component-specific styles */
.component-container {
    /* Use consistent spacing */
}
</style>
```

#### API Route Structure

```typescript
// /server/api/killmails/[id].get.ts
export default defineCachedEventHandler(async (event) => {
    // 1. Parameter validation
    const id = getRouterParam(event, 'id');
    if (!id || isNaN(Number(id))) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid killmail ID'
        });
    }

    // 2. Authentication (if required)
    const user = await getCurrentUser(event);

    // 3. Database operations
    try {
        const killmail = await KillmailModel.findById(id);
        if (!killmail) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Killmail not found'
            });
        }

        // 4. Return formatted response
        return {
            killmail: killmail.toJSON(),
            meta: {
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('Database error:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal server error'
        });
    }
}, {
    maxAge: 3600, // Cache for 1 hour
    staleMaxAge: -1, // Stale data can be cached forever
    swr: true, // Serve stale data while revalidating
    base: "redis",
    getKey: (event) => {
        return 'somekey';
    },
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
});
```

## 🔧 Development Workflow

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/killmail-search

# 2. Make changes and commit
git add .
git commit -m "feat: add advanced killmail search functionality"

# 3. Push and create PR
git push origin feature/killmail-search
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features
git commit -m "feat: add real-time killmail notifications"
git commit -m "feat(api): implement character search endpoint"

# Bug fixes
git commit -m "fix: resolve memory leak in job processor"
git commit -m "fix(ui): correct responsive layout on mobile"

# Documentation
git commit -m "docs: update API documentation"

# Refactoring
git commit -m "refactor: simplify database query logic"

# Chores
git commit -m "chore: update dependencies"
```

### Internationalization

```vue
<script setup lang="ts">
const { t } = useI18n();

// ✅ Good: Use translation keys
const title = t('killmails.detail.title');
const description = t('killmails.detail.description');
</script>

<template>
    <div>
        <h1>{{ t('killmails.detail.title') }}</h1>
        <p>{{ t('killmails.detail.description') }}</p>

        <!-- ✅ Good: Pluralization -->
        <span>{{ t('killmails.count', killmails.length) }}</span>
    </div>
</template>
```

Add translations to `i18n/locales/en.json`:

```json
{
    "killmails": {
        "detail": {
            "title": "Killmail Details",
            "description": "View detailed information about this killmail"
        },
        "count": "No killmails | {count} killmail | {count} killmails"
    }
}
```

## 🗄️ Backend Development

### Database Models

```typescript
// /server/models/Killmail.ts
import { Schema, model } from 'mongoose';

interface IKillmail {
    killmail_id: number;
    killmail_time: Date;
    victim: {
        character_id?: number;
        corporation_id: number;
        alliance_id?: number;
        ship_type_id: number;
        damage_taken: number;
    };
    attackers: Array<{
        character_id?: number;
        corporation_id?: number;
        alliance_id?: number;
        ship_type_id?: number;
        weapon_type_id?: number;
        damage_done: number;
        final_blow: boolean;
    }>;
    zkb?: {
        locationID: number;
        hash: string;
        fittedValue: number;
        totalValue: number;
        points: number;
        npc: boolean;
        solo: boolean;
        awox: boolean;
    };
}

const KillmailSchema = new Schema<IKillmail>({
    killmail_id: { type: Number, required: true, unique: true },
    killmail_time: { type: Date, required: true },
    victim: {
        character_id: { type: Number },
        corporation_id: { type: Number, required: true },
        alliance_id: { type: Number },
        ship_type_id: { type: Number, required: true },
        damage_taken: { type: Number, required: true }
    },
    attackers: [{
        character_id: { type: Number },
        corporation_id: { type: Number },
        alliance_id: { type: Number },
        ship_type_id: { type: Number },
        weapon_type_id: { type: Number },
        damage_done: { type: Number, required: true },
        final_blow: { type: Boolean, default: false }
    }]
}, {
    timestamps: true,
    collection: 'killmails'
});

// Indexes for performance
KillmailSchema.index({ killmail_id: 1 });
KillmailSchema.index({ killmail_time: -1 });
KillmailSchema.index({ 'victim.character_id': 1 });
KillmailSchema.index({ 'victim.corporation_id': 1 });

export const KillmailModel = model<IKillmail>('Killmail', KillmailSchema);
```

### Cronjob

```typescript
import { cliLogger } from "~/server/helpers/Logger";

export default {
  name: "cronjob",
  description: "cronjob",
  schedule: "* * * * *",
  run: async () => {
    cliLogger.info("Running cronjob every minute");
  },
};
```

### Queue Jobs

```typescript
// /src/queue/processKillmail.ts
import type { Job } from 'bullmq';

interface KillmailJobData {
    killmail_id: number;
    killmail_hash: string;
}

export async function processKillmail(job: Job<KillmailJobData>) {
    const { killmail_id, killmail_hash } = job.data;

    // Update progress
    await job.updateProgress(0);

    try {
        // 1. Fetch from ESI
        const esiData = await fetchFromESI(killmail_id, killmail_hash);
        await job.updateProgress(33);

        // 2. Process and validate
        const processedData = await processKillmailData(esiData);
        await job.updateProgress(66);

        // 3. Save to database
        await saveKillmail(processedData);
        await job.updateProgress(100);

        return { success: true, killmail_id };
    } catch (error) {
        console.error(`Failed to process killmail ${killmail_id}:`, error);
        throw error;
    }
}
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks (if configured)
bun run prepare

# Manual checks before committing
bun run lint
bun run type-check
```

## 🐛 Debugging

### Development Debugging

```bash
# Start with debugger
bun run debug

# Check logs
docker compose logs -f

# Database inspection
mongosh mongodb://localhost:27017/thessia

# Redis inspection
redis-cli
```

## 📚 Additional Resources

### Documentation

- **[API Documentation](./api/index.md)** - Complete API reference
- **[Frontend Documentation](./frontend/index.md)** - Vue/Nuxt specifics
- **[Backend Documentation](./backend/index.md)** - Server architecture

### External Resources

- **[Nuxt Documentation](https://nuxt.com/docs)**
- **[Vue Documentation](https://vuejs.org/guide/)**
- **[MongoDB Documentation](https://docs.mongodb.com/)**
- **[BullMQ Documentation](https://docs.bullmq.io/)**

### Community

- **[GitHub Discussions](https://github.com/eve-kill/Thessia/discussions)** - Ask questions
- **[Issues](https://github.com/eve-kill/Thessia/issues)** - Report bugs
- **[Transifex](https://app.transifex.com/eve-kill/thessia)** - Help translate

---

*Happy coding! Check out our [API Documentation](./api/index.md) to start building features.*
