<template>
    <div class="admin-content-wrapper">
        <!-- Database View -->
        <AdminDatabaseView v-if="isDatabase" :current-path="currentPath" @navigate="$emit('navigate', $event)" />

        <!-- Other admin views can be added here -->
        <AdminOverview v-else-if="currentPath === 'overview'" />
        <AdminAccessLogs v-else-if="currentPath === 'access-logs'" />
        <AdminQueues v-else-if="currentPath === 'queues'" />
        <AdminLogs v-else-if="currentPath === 'logs'" />
        <AdminUsersView v-else-if="currentPath === 'users'" />
        <AdminApiKeys v-else-if="currentPath === 'api-keys'" />
        <AdminCustomPrices v-else-if="currentPath === 'custom-prices'" />
        <AdminAnalyticsESI v-else-if="currentPath === 'analytics/esi'" />
        <AdminAnalyticsESILogs v-else-if="currentPath === 'analytics/esilogs'" />
        <AdminSettings v-else-if="currentPath === 'settings'" />
        <AdminKubernetes v-else-if="currentPath === 'kubernetes'" />

        <!-- Default placeholder for unimplemented sections -->
        <div v-else class="content-placeholder">
            <div class="placeholder-center">
                <Icon name="heroicons:document-chart-bar" class="placeholder-icon" />
                <h2 class="placeholder-title">{{ currentPageTitle }}</h2>
                <p class="placeholder-description">
                    {{ t('admin.placeholder.description') }}
                </p>
                <p class="placeholder-note">
                    {{ t('admin.placeholder.note') }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    currentPath: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

// Define emits
defineEmits<{
    navigate: [path: string];
}>();

// Check if current path is database-related
const isDatabase = computed(() => {
    return props.currentPath === 'database' || props.currentPath.startsWith('database/');
});

// Computed page titles to avoid hydration issues
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
        'analytics/esi': t('admin.analytics.esi.title'),
        'settings': t('admin.pages.settings'),
        'database': t('admin.pages.database'),
    };

    // Handle nested database paths
    if (props.currentPath.startsWith('database/')) {
        const pathParts = props.currentPath.split('/');
        if (pathParts.length >= 2 && pathParts[1]) {
            const collectionName = pathParts[1];
            return `${t('admin.pages.database')} - ${formatCollectionName(collectionName)}`;
        }
    }

    return titles[props.currentPath] || t('admin.pages.unknown');
});

/**
 * Format collection name for display
 */
function formatCollectionName(name: string): string {
    return name
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, str => str.toUpperCase())
        .trim();
}
</script>

<style scoped>
.admin-content-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    width: 100%;
    height: 100%;
    min-height: 0;
}

.content-placeholder {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    width: 100%;
    padding: 2rem;
    min-height: 400px;
}

.placeholder-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.placeholder-icon {
    width: 4rem;
    height: 4rem;
    color: rgb(156, 163, 175);
    margin-bottom: 1rem;
}

.placeholder-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.5rem;
}

.placeholder-description {
    color: rgb(209, 213, 219);
    margin-bottom: 1rem;
    max-width: 400px;
    line-height: 1.5;
}
</style>
