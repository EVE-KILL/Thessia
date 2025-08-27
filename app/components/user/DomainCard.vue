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

                <div class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <UIcon :name="entityIcon" class="w-4 h-4" />
                    <span>{{ entityLabel }}</span>
                </div>
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
                    {{ t('settings.domains.defaultPage') }}
                </div>
                <div class="text-sm text-gray-900 dark:text-white mt-1">
                    {{ formatDefaultPage(domain.default_page) }}
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

        <!-- Branding Preview -->
        <div v-if="domain.branding" class="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {{ t('settings.domains.branding') }}
            </div>
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded border" :style="{ backgroundColor: domain.branding.primary_color }">
                    </div>
                    <span class="text-xs text-gray-600 dark:text-gray-300">
                        {{ domain.branding.primary_color }}
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded border" :style="{ backgroundColor: domain.branding.secondary_color }">
                    </div>
                    <span class="text-xs text-gray-600 dark:text-gray-300">
                        {{ domain.branding.secondary_color }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Analytics Preview -->
        <div v-if="domain.analytics_enabled && domain.analytics" class="mb-4">
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {{ t('settings.domains.analytics') }}
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span class="text-gray-600 dark:text-gray-400">{{ t('settings.domains.totalVisits') }}:</span>
                    <span class="font-medium text-gray-900 dark:text-white ml-1">
                        {{ formatNumber(domain.analytics.total_visits) }}
                    </span>
                </div>
                <div v-if="domain.last_accessed">
                    <span class="text-gray-600 dark:text-gray-400">{{ t('settings.domains.lastAccessed') }}:</span>
                    <span class="font-medium text-gray-900 dark:text-white ml-1">
                        {{ formatDate(domain.last_accessed) }}
                    </span>
                </div>
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
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

// Computed properties
const domainStatus = computed(() => {
    if (!props.domain.verified) return 'unverified';
    if (props.domain.suspended) return 'suspended';
    if (!props.domain.active) return 'inactive';
    return 'active';
});

const entityIcon = computed(() => {
    switch (props.domain.entity_type) {
        case 'character': return 'i-heroicons-user';
        case 'corporation': return 'i-heroicons-building-office';
        case 'alliance': return 'i-heroicons-user-group';
        default: return 'i-heroicons-globe-alt';
    }
});

const entityLabel = computed(() => {
    const entityInfo = props.domain.entity_info;
    if (!entityInfo) return `${props.domain.entity_type} ${props.domain.entity_id}`;

    if (props.domain.entity_type === 'character') {
        return entityInfo.name;
    } else {
        return entityInfo.ticker ? `${entityInfo.name} [${entityInfo.ticker}]` : entityInfo.name;
    }
});

const isActive = ref(props.domain.active);
const dropdownOpen = ref(false);

// Methods
const toggleStatus = () => {
    emit('toggle-status', props.domain);
};

const formatDefaultPage = (page: string) => {
    const pageNames: Record<string, string> = {
        dashboard: t('dashboard'),
        kills: t('kills'),
        losses: t('losses'),
        combined: t('combined'),
        stats: t('stats'),
        members: t('members'),
        corporations: t('corporations'),
        characters: t('characters'),
        top: t('top'),
        battles: t('battles'),
        campaigns: t('campaigns')
    };
    return pageNames[page] || page;
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
