<template>
    <div
        class="domain-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {{ domain.domain }}
                    </h3>
                    <StatusBadge :status="domainStatus" />
                </div>

                <!-- PHASE 2: Multi-Entity Display -->
                <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <!-- Primary Entity -->
                    <div class="flex items-center gap-1">
                        <UIcon :name="primaryEntityIcon" class="w-4 h-4" />
                        <span class="font-medium">{{ primaryEntityLabel }}</span>
                    </div>

                    <!-- Additional Entities Count -->
                    <div v-if="additionalEntitiesCount > 0" class="flex items-center gap-1">
                        <span class="text-xs text-gray-500">+</span>
                        <UBadge size="xs" variant="outline">
                            +{{ additionalEntitiesCount }}
                        </UBadge>
                    </div>
                </div>

                <!-- PHASE 2: Multi-Entity List (Expandable) -->
                <div v-if="showAllEntities && domain.entities_info && domain.entities_info.length > 1"
                    class="space-y-1 mb-2">
                    <div v-for="(entityInfo, index) in domain.entities_info"
                        :key="`${entityInfo._config.entity_type}-${entityInfo._config.entity_id}`" :class="[
                            'flex items-center gap-2 text-xs p-2 rounded-md',
                            entityInfo._config.primary
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        ]">
                        <UIcon :name="getEntityIcon(entityInfo._config.entity_type)" class="w-3 h-3" />
                        <span class="flex-1 truncate">{{ getEntityLabel(entityInfo) }}</span>
                        <div class="flex items-center gap-1">
                            <UIcon v-if="entityInfo._config.primary" name="i-heroicons-star-solid"
                                class="w-3 h-3 text-yellow-500" title="Primary Entity" />
                            <UIcon v-if="entityInfo._config.show_in_nav" name="i-heroicons-eye" class="w-3 h-3"
                                title="Visible in Navigation" />
                        </div>
                    </div>
                </div>

                <!-- Toggle for showing all entities -->
                <button v-if="domain.entities_info && domain.entities_info.length > 1"
                    @click="showAllEntities = !showAllEntities"
                    class="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    {{ showAllEntities ? 'Show Less' : `Show All ${domain.entities_info.length} Entities` }}
                </button>
            </div>

            <div class="flex items-center gap-2 ml-4">
                <Dropdown v-model="dropdownOpen" position="bottom" align="end">
                    <template #trigger>
                        <UButton color="neutral" variant="ghost" icon="i-heroicons-ellipsis-vertical" size="sm" />
                    </template>

                    <div class="py-1 min-w-[180px]">
                        <button v-if="!domain.verified" @click="$emit('verify', domain); dropdownOpen = false"
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2">
                            <UIcon name="i-heroicons-shield-check" class="w-4 h-4" />
                            {{ t('settings.domains.verify') }}
                        </button>

                        <button @click="$emit('edit', domain); dropdownOpen = false"
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2">
                            <UIcon name="i-heroicons-pencil" class="w-4 h-4" />
                            {{ t('edit') }}
                        </button>

                        <!-- PHASE 2: Manage Entities -->
                        <button @click="$emit('manage-entities', domain); dropdownOpen = false"
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2">
                            <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
                            {{ t('settings.domains.manageEntities') }}
                        </button>

                        <button @click="$emit('delete', domain); dropdownOpen = false"
                            class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                            <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                            {{ t('delete') }}
                        </button>
                    </div>
                </Dropdown>
            </div>
        </div>

        <!-- Domain Info -->
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {{ t('settings.domains.layout') }}
                </div>
                <div class="text-sm text-gray-900 dark:text-white mt-1">
                    {{ formatLayout(domain.page_config?.layout) }}
                </div>
            </div>

            <div>
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {{ t('settings.domains.created') }}
                </div>
                <div class="text-sm text-gray-900 dark:text-white mt-1">
                    {{ formatDate(domain.created_at) }}
                </div>
            </div>
        </div>

        <!-- PHASE 2: Enhanced Branding Preview -->
        <div v-if="domain.branding" class="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {{ t('settings.domains.branding') }}
            </div>
            <div class="flex items-center gap-4 flex-wrap">
                <!-- Color Scheme -->
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded border" :style="{ backgroundColor: domain.branding.primary_color }">
                    </div>
                    <span class="text-xs text-gray-600 dark:text-gray-300">{{ domain.branding.primary_color }}</span>
                </div>

                <!-- Theme Mode -->
                <div class="flex items-center gap-1">
                    <UIcon :name="getThemeIcon(domain.branding.theme_mode)" class="w-3 h-3" />
                    <span class="text-xs text-gray-600 dark:text-gray-300 capitalize">
                        {{ domain.branding.theme_mode }}
                    </span>
                </div>

                <!-- Banner Image Indicator -->
                <div v-if="domain.branding.banner_image_url" class="flex items-center gap-1">
                    <UIcon name="i-heroicons-photo" class="w-3 h-3 text-green-600" />
                    <span class="text-xs text-green-600 dark:text-green-400">Banner</span>
                </div>
            </div>
        </div>

        <!-- PHASE 2: Page Components Preview -->
        <div v-if="domain.page_config?.components" class="mb-4">
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {{ t('settings.domains.activeComponents') }}
            </div>
            <div class="flex flex-wrap gap-1">
                <UBadge v-for="component in enabledComponents" :key="component" size="xs" variant="soft">
                    {{ formatComponentName(component) }}
                </UBadge>
            </div>
        </div>

        <!-- Domain Usage Info -->
        <div v-if="domain.usage" class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <div class="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                {{ t('settings.domains.usage') }}
            </div>
            <div class="text-sm text-blue-700 dark:text-blue-300">
                {{ domain.usage.domains_count }} / {{ domain.usage.domains_limit }} domains used
            </div>
        </div>

        <!-- Verification Notice -->
        <div v-if="!domain.verified" class="mb-4">
            <UAlert color="warning" variant="soft" :title="t('settings.domains.verificationRequired')"
                :description="t('settings.domains.verificationDescription')">
                <template #actions>
                    <UButton color="warning" variant="outline" size="xs" @click="$emit('verify', domain)">
                        {{ t('settings.domains.verify') }}
                    </UButton>
                </template>
            </UAlert>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
                <UButton :to="`https://${domain.domain}`" target="_blank" color="primary" variant="outline" size="sm"
                    icon="i-heroicons-arrow-top-right-on-square" :disabled="!domain.verified || !domain.active">
                    {{ t('settings.domains.visit') }}
                </UButton>

                <UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-pencil"
                    @click="$emit('edit', domain)">
                    {{ t('edit') }}
                </UButton>
            </div>

            <div class="flex items-center gap-2">
                <UToggle v-model="isActive" :disabled="!domain.verified" @update:model-value="toggleStatus" />
                <span class="text-sm text-gray-600 dark:text-gray-400">
                    {{ isActive ? t('active') : t('inactive') }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Dropdown from '~/components/common/Dropdown.vue';
import StatusBadge from '~/components/ui/StatusBadge.vue';

interface Props {
    domain: any;
}

interface Emits {
    (e: 'edit', domain: any): void;
    (e: 'delete', domain: any): void;
    (e: 'verify', domain: any): void;
    (e: 'toggle-status', domain: any): void;
    (e: 'manage-entities', domain: any): void; // PHASE 2: New emit for entity management
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

// PHASE 2: State for multi-entity display
const showAllEntities = ref(false);

// Computed properties
const domainStatus = computed(() => {
    if (!props.domain.verified) return 'unverified';
    if (props.domain.suspended) return 'suspended';
    if (!props.domain.active) return 'inactive';
    return 'active';
});

// PHASE 2: Primary entity logic
const primaryEntityIcon = computed(() => {
    const primaryEntity = props.domain.primary_entity || props.domain.entity_info;
    if (!primaryEntity) return 'i-heroicons-globe-alt';
    return getEntityIcon(primaryEntity._config?.entity_type || props.domain.entity_type);
});

const primaryEntityLabel = computed(() => {
    const primaryEntity = props.domain.primary_entity || props.domain.entity_info;
    if (!primaryEntity) return 'Unknown Entity';
    return getEntityLabel(primaryEntity);
});

const additionalEntitiesCount = computed(() => {
    const totalEntities = props.domain.entities_info?.length || 0;
    return Math.max(0, totalEntities - 1);
});

// PHASE 2: Enabled components for display
const enabledComponents = computed(() => {
    if (!props.domain.page_config?.components) return [];
    return Object.entries(props.domain.page_config.components)
        .filter(([_, enabled]) => enabled)
        .map(([component, _]) => component);
});

const isActive = ref(props.domain.active);
const dropdownOpen = ref(false);

// Methods
const toggleStatus = () => {
    emit('toggle-status', props.domain);
};

const getEntityIcon = (entityType: string) => {
    switch (entityType) {
        case 'character': return 'i-heroicons-user';
        case 'corporation': return 'i-heroicons-building-office';
        case 'alliance': return 'i-heroicons-user-group';
        default: return 'i-heroicons-globe-alt';
    }
};

const getEntityLabel = (entityInfo: any) => {
    if (!entityInfo) return 'Unknown Entity';

    if (entityInfo._config?.entity_type === 'character' || props.domain.entity_type === 'character') {
        return entityInfo.name || 'Unknown Character';
    } else {
        return entityInfo.ticker ? `${entityInfo.name} [${entityInfo.ticker}]` : (entityInfo.name || 'Unknown Entity');
    }
};

const getThemeIcon = (themeMode: string) => {
    switch (themeMode) {
        case 'dark': return 'i-heroicons-moon';
        case 'light': return 'i-heroicons-sun';
        default: return 'i-heroicons-computer-desktop';
    }
};

const formatLayout = (layout: string) => {
    const layoutNames: Record<string, string> = {
        default: 'Default',
        compact: 'Compact',
        detailed: 'Detailed'
    };
    return layoutNames[layout] || layout || 'Default';
};

const formatComponentName = (component: string) => {
    return component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
};

const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
};

// Watch for external changes to domain status
watch(() => props.domain.active, (newValue) => {
    isActive.value = newValue;
});
</script>

<style scoped>
.domain-card {
    transition: box-shadow 0.2s ease-in-out;
}

.domain-card:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
