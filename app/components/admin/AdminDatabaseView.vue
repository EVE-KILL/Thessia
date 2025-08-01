<template>
    <div class="database-view">
        <!-- Database Overview -->
        <div v-if="currentPath === 'database'" class="database-overview">
            <div class="overview-header">
                <h3 class="overview-title">{{ t('admin.database.overview.title') }}</h3>
                <p class="overview-description">{{ t('admin.database.overview.description') }}</p>
            </div>

            <!-- Collections Grid -->
            <div v-if="pending" class="loading-container">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ t('admin.database.loading') }}</p>
            </div>

            <div v-else-if="error" class="error-container">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.database.error') }}</p>
                <button @click="() => refresh()" class="error-retry">
                    {{ t('admin.database.retry') }}
                </button>
            </div>

            <div v-else class="collections-grid">
                <div v-for="collection in collections" :key="collection.name" class="collection-card"
                    @click="navigateToCollection(collection.name)">
                    <div class="collection-header">
                        <Icon name="heroicons:table-cells" class="collection-icon" />
                        <h4 class="collection-name">{{ collection.displayName }}</h4>
                    </div>
                    <div class="collection-stats">
                        <div class="stat">
                            <span class="stat-label">{{ t('admin.database.documents') }}</span>
                            <span class="stat-value">{{ formatNumber(collection.count) }}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">{{ t('admin.database.collection') }}</span>
                            <span class="stat-value collection-id">{{ collection.name }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Collection Detail View -->
        <AdminCollectionView v-else-if="currentPath.startsWith('database/')" :collection-name="collectionName"
            :current-path="currentPath" />
    </div>
</template>

<script setup lang="ts">
interface Props {
    currentPath: string;
}

interface Collection {
    name: string;
    displayName: string;
    count: number;
    size: number;
    avgObjSize: number;
    storageSize: number;
    indexes: number;
}

const props = defineProps<Props>();
const { t } = useI18n();

// Extract collection name from path
const collectionName = computed(() => {
    if (props.currentPath.startsWith('database/')) {
        const parts = props.currentPath.split('/');
        return parts[1] || '';
    }
    return '';
});

// Fetch collections data
const { data: collectionsData, pending, error, refresh } = useAsyncData('admin-collections', () =>
    $fetch('/api/admin/database/collections'), {
    lazy: true,
    server: false,
});

const collections = computed(() => {
    return collectionsData.value?.collections || [];
});

// Format number for display
const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
};

// Navigate to collection
const navigateToCollection = (collection: string) => {
    // Emit navigation event to parent
    emitNavigation(`database/${collection}`);
};

// Emit navigation event
const emit = defineEmits<{
    navigate: [path: string];
}>();

const emitNavigation = (path: string) => {
    emit('navigate', path);
};
</script>

<style scoped>
.database-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 2rem;
}

.database-overview {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.overview-header {
    text-align: center;
    margin-bottom: 1rem;
}

.overview-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.5rem;
}

.overview-description {
    color: rgb(156, 163, 175);
    max-width: 600px;
    margin: 0 auto;
}

.loading-container,
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
}

.loading-icon,
.error-icon {
    width: 2rem;
    height: 2rem;
    color: rgb(156, 163, 175);
}

.loading-text,
.error-text {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.error-retry {
    padding: 0.5rem 1rem;
    background-color: rgb(59, 130, 246);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
}

.error-retry:hover {
    background-color: rgb(37, 99, 235);
}

.collections-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
}

.collection-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
}

.collection-card:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgb(96, 165, 250);
    transform: translateY(-2px);
}

.collection-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.collection-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: rgb(96, 165, 250);
}

.collection-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
}

.collection-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.stat-label {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

.stat-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
}

.collection-id {
    font-family: monospace;
    background: rgba(0, 0, 0, 0.3);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .database-view {
        padding: 1rem;
    }

    .collections-grid {
        grid-template-columns: 1fr;
    }
}
</style>
