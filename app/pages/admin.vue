<template>
    <div class="admin-layout">
        <!-- Loading state while checking authentication -->
        <ClientOnly>
            <div v-if="!isAuthenticated || !isAdministrator" class="admin-loading">
                <div class="loading-container">
                    <Icon name="lucide:loader-2" class="loading-icon animate-spin" />
                    <p class="loading-text">{{ t('admin.authentication.checking') }}</p>
                </div>
            </div>

            <!-- Main Content Area - Only show when authenticated and admin -->
            <div v-else class="admin-content">
                <!-- Sidebar Navigation (20%) -->
                <aside class="admin-sidebar">
                    <AdminNavigation :current-path="currentPath" @navigate="handleNavigation" />
                </aside>

                <!-- Content Area (80%) -->
                <main class="admin-main">
                    <!-- Content Header -->
                    <div class="admin-header">
                        <div class="header-content">
                            <div class="header-info">
                                <nav class="breadcrumb">
                                    <span class="breadcrumb-item">{{ t('admin.navigation') }}</span>
                                    <Icon name="heroicons:chevron-right" class="breadcrumb-separator" />
                                    <span v-for="(crumb, index) in breadcrumbs" :key="index" class="breadcrumb-item"
                                        :class="{ 'breadcrumb-current': index === breadcrumbs.length - 1 }">
                                        {{ crumb }}
                                        <Icon v-if="index < breadcrumbs.length - 1" name="heroicons:chevron-right"
                                            class="breadcrumb-separator" />
                                    </span>
                                </nav>
                            </div>
                        </div>
                    </div>

                    <!-- Content Body -->
                    <div class="admin-body">
                        <AdminContent :current-path="currentPath" />
                    </div>
                </main>
            </div>

            <template #fallback>
                <div class="admin-loading">
                    <div class="loading-container">
                        <Icon name="lucide:loader-2" class="loading-icon animate-spin" />
                        <p class="loading-text">{{ t('admin.authentication.checking') }}</p>
                    </div>
                </div>
            </template>
        </ClientOnly>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const authStore = useAuthStore();
const { isAuthenticated, isAdministrator } = storeToRefs(authStore);
const { checkAuth } = authStore;

// Set up SEO meta
useSeoMeta({
    title: () => t('admin.seo.title'),
    description: () => t('admin.seo.description'),
    robots: 'noindex, nofollow', // Admin pages should not be indexed
});

// Apply admin middleware
definePageMeta({
    middleware: 'admin'
});

// Additional client-side protection
onMounted(async () => {
    // Double-check authentication on mount
    if (!isAuthenticated.value) {
        await checkAuth();
    }

    // If still not authenticated or not admin, force full page reload to home
    if (!isAuthenticated.value || !isAdministrator.value) {
        if (import.meta.client) {
            window.location.href = '/';
        }
    }
});

// Reactive state for current admin panel section
const currentPath = ref('overview');

// Computed page title based on current path
const currentPageTitle = computed(() => {
    const titles: Record<string, string> = {
        'overview': t('admin.pages.overview'),
        'access-logs': t('admin.pages.accessLogs'),
        'traffic': t('admin.pages.traffic'),
        'performance': t('admin.pages.performance'),
        'status': t('admin.pages.status'),
        'queues': t('admin.pages.queues'),
        'logs': t('admin.pages.logs'),
        'users': t('admin.pages.users'),
        'settings': t('admin.pages.settings'),
        'database': t('admin.pages.database'),
    };

    // Handle nested paths like 'database/models' or 'database/models/killmails'
    const pathParts = currentPath.value.split('/');
    const mainPath = pathParts[0] || 'overview';

    return titles[mainPath] || t('admin.pages.unknown');
});

// Computed breadcrumbs for nested navigation
const breadcrumbs = computed(() => {
    const pathParts = currentPath.value.split('/');
    const crumbs: string[] = [];

    // Build breadcrumbs from path segments
    let currentSegment = '';
    for (const part of pathParts) {
        currentSegment = currentSegment ? `${currentSegment}/${part}` : part;

        // Get the display name for this segment
        const segmentTitles: Record<string, string> = {
            'overview': t('admin.pages.overview'),
            'access-logs': t('admin.pages.accessLogs'),
            'traffic': t('admin.pages.traffic'),
            'performance': t('admin.pages.performance'),
            'status': t('admin.pages.status'),
            'queues': t('admin.pages.queues'),
            'logs': t('admin.pages.logs'),
            'users': t('admin.pages.users'),
            'settings': t('admin.pages.settings'),
            'database': t('admin.pages.database'),
            'models': t('admin.pages.models'),
            'killmails': t('admin.pages.killmails'),
            'characters': t('admin.pages.characters'),
            'corporations': t('admin.pages.corporations'),
            'alliances': t('admin.pages.alliances'),
        };

        crumbs.push(segmentTitles[currentSegment] || segmentTitles[part] || part);
    }

    return crumbs;
});/**
 * Handle navigation between admin sections
 */
const handleNavigation = (path: string) => {
    currentPath.value = path;
};
</script>

<style scoped>
.admin-layout {
    min-height: 100vh;
}

/* Loading State */
.admin-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    border-radius: 0.5rem;
}

.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
}

.loading-icon {
    width: 2rem;
    height: 2rem;
    color: rgb(96, 165, 250);
}

.loading-text {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.admin-content {
    display: grid;
    grid-template-columns: 20% 80%;
    min-height: calc(100vh - 2rem);
}

/* Sidebar Styles */
.admin-sidebar {
    border-radius: 0.5rem;
    padding: 1.5rem;
    height: fit-content;
    position: sticky;
    top: 1rem;
}

/* Main Content Area Styles */
.admin-main {
    border-radius: 0.5rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* Content Header */
.admin-header {
    border-bottom: 1px solid rgb(55, 55, 55);
    padding: 2rem;
    flex-shrink: 0;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
}

.header-info {
    flex: 1;
}

.breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
}

.breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgb(156, 163, 175);
}

.breadcrumb-current {
    color: rgb(96, 165, 250);
    font-weight: 500;
}

.breadcrumb-separator {
    width: 0.875rem;
    height: 0.875rem;
    color: rgb(75, 85, 99);
}

.header-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
}

.action-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background-color: rgb(59, 130, 246);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
}

.action-button:hover {
    background-color: rgb(37, 99, 235);
}

.action-icon {
    width: 1rem;
    height: 1rem;
}

/* Content Body */
.admin-body {
    flex: 1;
    overflow-y: auto;
    height: 100%;
    min-height: 0;
    /* Important for flex children */
}

/* Responsive adjustments */
@media (max-width: 1024px) {
    .admin-content {
        grid-template-columns: 200px 1fr;
    }
}

@media (max-width: 768px) {
    .admin-layout {
        padding: 0.5rem;
    }

    .admin-content {
        grid-template-columns: 1fr;
    }

    .admin-sidebar {
        display: none;
    }

    .header-content {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }
}
</style>
