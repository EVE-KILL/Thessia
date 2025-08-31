# Admin Panel Development Guide

This guide explains how to add new panels to the Thessia admin interface.

## Overview

The admin panel system consists of:

- **Navigation Component**: `app/components/admin/AdminNavigation.vue`
- **Content Router**: `app/components/admin/AdminContent.vue`
- **Individual Panels**: `app/components/admin/Admin*.vue`
- **API Endpoints**: `server/api/admin/**/*.ts`
- **Translations**: `i18n/locales/en.json`

## Architecture

```markdown
/admin
├── AdminNavigation.vue    # Left sidebar navigation
├── AdminContent.vue       # Content routing logic
└── AdminPanel.vue         # Individual panel components
```

## Adding a New Admin Panel

Follow these steps to add a new admin panel:

### 1. Create the API Endpoint

Create a new API endpoint in `server/api/admin/[entity]/index.get.ts`:

```typescript
import { EntityModel } from "../../../models/EntityModel";
import { Users } from "../../../models/Users";

export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Authentication check
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    const user = await Users.findOne({ uniqueIdentifier: cookie });

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid authentication",
        });
    }

    // Only allow administrators
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Access denied. Administrator privileges required.",
        });
    }

    try {
        const query = getQuery(event);
        const page = parseInt(query.page as string) || 1;
        const limit = parseInt(query.limit as string) || 25;
        const search = (query.search as string) || "";

        // Build MongoDB filter
        const filter: any = {};

        // Handle search
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { entity_id: isNaN(parseInt(search)) ? undefined : parseInt(search) }
            ].filter(Boolean);
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Fetch entities with pagination
        const entities = await EntityModel.find(filter)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await EntityModel.countDocuments(filter);

        // Calculate pagination info
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Get stats
        const stats = {
            total: await EntityModel.countDocuments({}),
            active: await EntityModel.countDocuments({ deleted: { $ne: true } }),
            deleted: await EntityModel.countDocuments({ deleted: true }),
        };

        return {
            entities,
            stats,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage,
                hasPrevPage,
                total,
            },
        };
    } catch (error) {
        console.error("Error fetching entities:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal server error",
        });
    }
});
```

### 2. Create the Vue Component

Create `app/components/admin/AdminEntity.vue`:

```vue
<template>
    <div class="admin-entities">
        <div class="entities-header">
            <div class="header-info">
                <h3 class="entities-title">{{ t('admin.entities.title') }}</h3>
                <p class="entities-description">{{ t('admin.entities.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="() => refreshData()" class="action-btn refresh-btn" :disabled="pending">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': pending }" />
                    {{ t('admin.entities.refresh') }}
                </button>
            </div>
        </div>

        <!-- Filters and Search -->
        <div class="filters-section">
            <div class="search-container">
                <Icon name="heroicons:magnifying-glass" class="search-icon" />
                <input v-model="searchQuery" type="text" :placeholder="t('admin.entities.search')"
                    class="search-input" />
                <button v-if="searchQuery" @click="clearSearch" class="search-clear-btn"
                    :title="t('admin.entities.clearSearch')">
                    <Icon name="heroicons:x-mark" class="clear-icon" />
                </button>
            </div>

            <div class="filters-row">
                <select v-model="pageSize" class="page-size-select" :aria-label="'Items per page'"
                    @change="handlePageSizeChange">
                    <option value="10">10 {{ t('admin.entities.perPage') }}</option>
                    <option value="25">25 {{ t('admin.entities.perPage') }}</option>
                    <option value="50">50 {{ t('admin.entities.perPage') }}</option>
                    <option value="100">100 {{ t('admin.entities.perPage') }}</option>
                </select>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="pending" class="loading-container">
            <div class="loading-content">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ t('admin.entities.loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-container">
            <div class="error-content">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.entities.error') }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.entities.retry') }}
                </button>
            </div>
        </div>

        <!-- Content -->
        <div v-else-if="data?.entities && data.entities.length > 0" class="entities-content">
            <!-- Statistics Cards -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon-container verified">
                        <Icon name="heroicons:check-circle" class="stat-icon" />
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">{{ t('admin.entities.activeEntities') }}</div>
                        <div class="stat-value">{{ data.stats.active }}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-container failed">
                        <Icon name="heroicons:exclamation-triangle" class="stat-icon" />
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">{{ t('admin.entities.deletedEntities') }}</div>
                        <div class="stat-value">{{ data.stats.deleted || 0 }}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-container total">
                        <Icon name="heroicons:cube" class="stat-icon" />
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">{{ t('admin.entities.totalEntities') }}</div>
                        <div class="stat-value">{{ data.stats.total }}</div>
                    </div>
                </div>
            </div>

            <!-- Entities List -->
            <div class="entities-list">
                <div v-for="entity in data.entities" :key="entity.entity_id" class="entity-card">
                    <!-- Entity Info -->
                    <div class="entity-info-section">
                        <div class="entity-avatar">
                            <!-- Use appropriate Image component based on entity type -->
                            <Image :type="'type-icon'" :id="entity.entity_id" :size="64" />
                        </div>
                        <div class="entity-details">
                            <h4 class="entity-name">
                                <NuxtLink :to="`/entity/${entity.entity_id}`">
                                    {{ entity.name || `Entity ${entity.entity_id}` }}
                                </NuxtLink>
                            </h4>
                            <div class="entity-meta">
                                <div class="entity-meta-item">
                                    <Icon name="heroicons:calendar" class="meta-icon" />
                                    <span>Updated: {{ formatDateRelative(entity.updatedAt) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="entity-actions-row">
                        <button @click="refreshEntity(entity)" class="action-btn-slim refresh-btn">
                            <Icon name="heroicons:arrow-path" class="action-btn-icon" />
                            Refresh
                        </button>
                        <button @click="editEntity(entity)" class="action-btn-slim edit-btn">
                            <Icon name="heroicons:pencil-square" class="action-btn-icon" />
                            Edit
                        </button>
                        <button @click="deleteEntity(entity)" class="action-btn-slim delete-btn">
                            <Icon name="heroicons:trash" class="action-btn-icon" />
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-container">
            <div class="empty-content">
                <Icon name="heroicons:cube" class="empty-icon" />
                <h4 class="empty-title">{{ t('admin.entities.empty') }}</h4>
                <p class="empty-description">{{ t('admin.entities.noEntitiesFound') }}</p>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="data?.pagination && data.pagination.totalPages > 1" class="pagination-container">
            <button @click="changePage(1)" :disabled="!data.pagination.hasPrevPage" class="pagination-btn">
                {{ t('admin.entities.pagination.first') }}
            </button>
            <button @click="changePage(data.pagination.currentPage - 1)" :disabled="!data.pagination.hasPrevPage"
                class="pagination-btn">
                {{ t('admin.entities.pagination.previous') }}
            </button>

            <span class="pagination-info">
                {{ t('admin.entities.pagination.page', {
                    current: data.pagination.currentPage,
                    total: data.pagination.totalPages
                }) }}
            </span>

            <button @click="changePage(data.pagination.currentPage + 1)" :disabled="!data.pagination.hasNextPage"
                class="pagination-btn">
                {{ t('admin.entities.pagination.next') }}
            </button>
            <button @click="changePage(data.pagination.totalPages)" :disabled="!data.pagination.hasNextPage"
                class="pagination-btn">
                {{ t('admin.entities.pagination.last') }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">

interface Entity {
    entity_id: number;
    name: string;
    // Add other entity properties as needed
    deleted?: boolean;
    error?: string;
    createdAt: string;
    updatedAt: string;
}

interface EntitiesResponse {
    entities: Entity[];
    stats: {
        total: number;
        active: number;
        deleted: number;
    };
    pagination: {
        currentPage: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        total: number;
    };
}

const { t } = useI18n();

// Reactive state
const currentPage = ref(1);
const pageSize = ref(25);
const searchQuery = ref('');

// Computed API endpoint
const apiEndpoint = computed(() => {
    const params = new URLSearchParams();

    if (currentPage.value > 1) params.set('page', currentPage.value.toString());
    if (pageSize.value !== 25) params.set('limit', pageSize.value.toString());
    if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim());

    return `/api/admin/entities?${params.toString()}`;
});

// Fetch data
const { data, pending, error, refresh: refreshData } = useAsyncData<EntitiesResponse>(
    'admin-entities',
    () => $fetch(apiEndpoint.value),
    {
        server: false,
        watch: [currentPage, pageSize, searchQuery],
    }
);

// Methods
const clearSearch = () => {
    searchQuery.value = '';
};

const handlePageSizeChange = () => {
    currentPage.value = 1;
};

const changePage = (page: number) => {
    currentPage.value = page;
};

const formatDateRelative = (date: string) => {
    return new Date(date).toLocaleDateString();
};

const refreshEntity = (entity: Entity) => {
    // TODO: Implement entity refresh logic
    console.log('Refresh entity:', entity.entity_id);
};

const editEntity = (entity: Entity) => {
    // TODO: Implement entity edit logic
    console.log('Edit entity:', entity.entity_id);
};

const deleteEntity = (entity: Entity) => {
    // TODO: Implement entity delete logic
    console.log('Delete entity:', entity.entity_id);
};

</script>

<style scoped>
/* Copy styles from existing admin components like AdminCharacters.vue */
</style>
```

### 3. Add Navigation Item

In `app/components/admin/AdminNavigation.vue`, add the new navigation item:

```vue
<AdminNavItem
    :item="{
        name: t('admin.pages.entities'),
        path: 'entities',
        icon: 'heroicons:cube'
    }"
    :current-path="currentPath"
    @navigate="$emit('navigate', 'entities')"
/>
```

### 4. Add Content Routing

In `app/components/admin/AdminContent.vue`, add:

**Import the component** (if needed):

```vue
<AdminEntities v-else-if="currentPath === 'entities'" />
```

**Add page title**:

```typescript
const titles: Record<string, string> = {
    // ... existing titles
    'entities': t('admin.pages.entities'),
};
```

### 5. Add Translations

In `i18n/locales/en.json`, add the translations under `admin.pages`:

```json
{
    "admin": {
        "pages": {
            "entities": "Entity Management"
        },
        "entities": {
            "title": "Entity Management",
            "description": "Manage and view entity data",
            "refresh": "Refresh",
            "search": "Search entities...",
            "clearSearch": "Clear search",
            "loading": "Loading entities...",
            "error": "Failed to load entities",
            "retry": "Retry",
            "empty": "No entities found",
            "noEntitiesFound": "No entities match the current filters",
            "perPage": "per page",
            "activeEntities": "Active Entities",
            "deletedEntities": "Deleted Entities",
            "totalEntities": "Total Entities",
            "pagination": {
                "first": "First",
                "previous": "Previous",
                "next": "Next",
                "last": "Last",
                "page": "Page {current} of {total}"
            }
        }
    }
}
```

## Common Patterns

### Authentication

All admin API endpoints must include:

1. Authentication check using `evelogin` cookie
2. User lookup in database
3. Administrator privilege verification

### Data Fetching

Use the `useAsyncData` composable with:

- `server: false` for admin panels (client-side only)
- Reactive `watch` for search/pagination parameters
- Proper error handling and loading states

### Styling

All admin panels should use consistent styling:

- Follow existing CSS patterns
- Use the standardized card layout
- Include loading, error, and empty states
- Implement responsive design

### Icons

Use Heroicons for consistency:

- Navigation: `heroicons:*`
- Actions: `heroicons:arrow-path`, `heroicons:pencil-square`, `heroicons:trash`
- Status: `heroicons:check-circle`, `heroicons:exclamation-triangle`

## Example Admin Panels

Reference existing implementations:

- **Characters**: `app/components/admin/AdminCharacters.vue`
- **Corporations**: `app/components/admin/AdminCorporations.vue`
- **Alliances**: `app/components/admin/AdminAlliances.vue`
- **Domains**: `app/components/admin/AdminDomains.vue`

## Testing

1. **Authentication**: Ensure only administrators can access
2. **Data Loading**: Test pagination, search, and error states
3. **Responsive Design**: Test on different screen sizes
4. **Translation**: Verify all strings are translatable

## Best Practices

1. **Keep consistent patterns** with existing panels
2. **Use TypeScript** for all components and interfaces
3. **Implement proper error handling** for API failures
4. **Follow the project's styling conventions**
5. **Add comprehensive translations** for internationalization
6. **Document any new APIs** in the appropriate `/docs/api/` files

This modular approach ensures consistency across all admin panels while making it easy to add new functionality.
