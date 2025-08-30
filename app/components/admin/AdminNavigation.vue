<template>
    <nav class="admin-nav">
        <h2 class="nav-title">{{ t('admin.navigation') }}</h2>

        <div class="nav-tree">
            <!-- Dashboard -->
            <div class="nav-section">
                <h3 class="nav-section-title">{{ t('admin.sections.dashboard') }}</h3>
                <AdminNavItem :item="{ name: t('admin.nav.overview'), path: 'overview', icon: 'heroicons:home' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'overview')" />
            </div>

            <!-- Analytics -->
            <div class="nav-section">
                <h3 class="nav-section-title">{{ t('admin.sections.analytics') }}</h3>
                <AdminNavItem
                    :item="{ name: t('admin.nav.accessLogs'), path: 'access-logs', icon: 'heroicons:chart-bar' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'access-logs')" />
                <AdminNavItem
                    :item="{ name: t('admin.analytics.esi.title'), path: 'analytics/esi', icon: 'heroicons:key' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'analytics/esi')" />
                <AdminNavItem
                    :item="{ name: t('admin.analytics.esiLogs.title'), path: 'analytics/esilogs', icon: 'heroicons:document-text' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'analytics/esilogs')" />
            </div>

            <!-- System -->
            <div class="nav-section">
                <h3 class="nav-section-title">{{ t('admin.sections.system') }}</h3>
                <AdminNavItem :item="{ name: t('admin.nav.queues'), path: 'queues', icon: 'heroicons:queue-list' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'queues')" />
                <AdminNavItem :item="{ name: t('admin.nav.logs'), path: 'logs', icon: 'heroicons:document-text' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'logs')" />
                <AdminNavItem :item="{ name: t('admin.nav.kubernetes'), path: 'kubernetes', icon: 'heroicons:cube' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'kubernetes')" />
            </div>

            <!-- Management -->
            <div class="nav-section">
                <h3 class="nav-section-title">{{ t('admin.sections.management') }}</h3>
                <AdminNavItem :item="{ name: t('admin.nav.users'), path: 'users', icon: 'heroicons:users' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'users')" />
                <AdminNavItem :item="{ name: t('admin.nav.domains'), path: 'domains', icon: 'heroicons:globe-alt' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'domains')" />
                <AdminNavItem
                    :item="{ name: t('admin.nav.comments'), path: 'comments', icon: 'heroicons:chat-bubble-left-right' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'comments')" />
                <AdminNavItem :item="{ name: t('admin.nav.apiKeys'), path: 'api-keys', icon: 'heroicons:key' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'api-keys')" />
                <AdminNavItem
                    :item="{ name: t('admin.nav.customPrices'), path: 'custom-prices', icon: 'heroicons:currency-dollar' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'custom-prices')" />

                <!-- Database Management with dropdown -->
                <div class="nav-item-container">
                    <AdminNavItem
                        :item="{ name: t('admin.nav.database'), path: 'database', icon: 'heroicons:circle-stack' }"
                        :current-path="currentPath" :has-children="true" :is-expanded="isDatabaseExpanded"
                        @navigate="toggleDatabase" />

                    <!-- Database Collections Dropdown -->
                    <div v-if="isDatabaseExpanded" class="nav-dropdown">
                        <AdminNavItem v-for="collection in databaseCollections" :key="collection.name" :item="{
                            name: collection.displayName,
                            path: `database/${collection.name}`,
                            icon: 'heroicons:table-cells'
                        }" :current-path="currentPath" :is-child="true"
                            @navigate="$emit('navigate', `database/${collection.name}`)" />
                    </div>
                </div>

                <AdminNavItem :item="{ name: t('admin.nav.settings'), path: 'settings', icon: 'heroicons:cog-6-tooth' }"
                    :current-path="currentPath" @navigate="$emit('navigate', 'settings')" />
            </div>
        </div>
    </nav>
</template>

<script setup lang="ts">
interface Props {
    currentPath: string;
}

interface DatabaseCollection {
    name: string;
    displayName: string;
    modelFile: string;
    count: number;
}

const props = defineProps<Props>();
defineEmits<{
    navigate: [path: string];
}>();

const { t } = useI18n();

// Database dropdown state
const isDatabaseExpanded = ref(false);
const databaseCollections = ref<DatabaseCollection[]>([]);

// Toggle database dropdown and fetch collections if needed
const toggleDatabase = async () => {
    if (!isDatabaseExpanded.value && databaseCollections.value.length === 0) {
        try {
            const response = await $fetch('/api/admin/database/collections');
            if (response.success) {
                databaseCollections.value = response.collections;
            }
        } catch (error) {
            console.error('Failed to fetch database collections:', error);
        }
    }
    isDatabaseExpanded.value = !isDatabaseExpanded.value;
};

// Watch current path to auto-expand database section if on database page
watch(() => props.currentPath, (newPath) => {
    if (newPath.startsWith('database/')) {
        isDatabaseExpanded.value = true;
        // Fetch collections if not already loaded
        if (databaseCollections.value.length === 0) {
            toggleDatabase();
        }
    }
}, { immediate: true });
</script>

<style scoped>
.admin-nav {
    height: 100%;
}

.nav-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

.nav-tree {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.nav-section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.nav-section-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(156, 163, 175);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    padding-left: 0.5rem;
}

.nav-item-container {
    display: flex;
    flex-direction: column;
}

.nav-dropdown {
    margin-left: 0.5rem;
    border-left: 1px solid rgb(55, 55, 55);
    padding-left: 0.5rem;
    margin-top: 0.25rem;
}
</style>
