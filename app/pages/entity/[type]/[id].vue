<template>
    <div class="entity-page">
        <!-- Custom Branding Provider -->
        <CustomBrandingProvider v-if="isCustomDomain" />

        <!-- Entity Header -->
        <div class="entity-header bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div class="container mx-auto px-4 py-6">
                <div class="flex items-center gap-6">
                    <!-- Entity Avatar -->
                    <div class="flex-shrink-0">
                        <img :src="entityAvatar" :alt="entity?.name" class="w-20 h-20 rounded-lg"
                            @error="handleImageError" />
                    </div>

                    <!-- Entity Info -->
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                                {{ entity?.name || 'Loading...' }}
                            </h1>
                            <UBadge :color="getEntityTypeColor(entityType)" variant="soft" size="sm">
                                {{ $t(entityType) }}
                            </UBadge>
                        </div>

                        <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div v-if="entity?.ticker" class="flex items-center gap-1">
                                <span class="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    [{{ entity.ticker }}]
                                </span>
                            </div>

                            <div v-if="entity?.memberCount" class="flex items-center gap-1">
                                <UIcon name="i-heroicons-users" class="w-4 h-4" />
                                <span>{{ formatNumber(entity.memberCount) }} {{ $t('members') }}</span>
                            </div>

                            <div v-if="entity?.founded" class="flex items-center gap-1">
                                <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
                                <span>{{ $t('founded') }} {{ formatDate(entity.founded) }}</span>
                            </div>
                        </div>

                        <!-- Custom Domain Indicator -->
                        <div v-if="isCustomDomain && customDomain" class="mt-3">
                            <div
                                class="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm">
                                <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
                                <span>{{ customDomain.domain }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div class="container mx-auto px-4">
                <UTabs v-model="activeTab" :items="availableTabs" class="w-full" />
            </div>
        </div>

        <!-- Tab Content -->
        <div class="container mx-auto px-4 py-8">
            <!-- Overview Tab -->
            <div v-if="activeTab === 'overview'" class="space-y-8">
                <EntityOverview :entity="entity" :entity-type="entityType" :entity-id="entityId" />
            </div>

            <!-- Killmails Tab -->
            <div v-else-if="activeTab === 'killmails'" class="space-y-6">
                <EntityKillmails :entity-type="entityType" :entity-id="entityId" />
            </div>

            <!-- Campaigns Tab (Custom Domain Only) -->
            <div v-else-if="activeTab === 'campaigns' && isCustomDomain" class="space-y-6">
                <EntityCampaigns :entity-type="entityType" :entity-id="entityId" />
            </div>

            <!-- Stats Tab -->
            <div v-else-if="activeTab === 'stats'" class="space-y-6">
                <EntityStats :entity-type="entityType" :entity-id="entityId" />
            </div>

            <!-- Members Tab (Corporation/Alliance only) -->
            <div v-else-if="activeTab === 'members' && ['corporation', 'alliance'].includes(entityType)"
                class="space-y-6">
                <EntityMembers :entity-type="entityType" :entity-id="entityId" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface EntityData {
    id: number;
    name: string;
    ticker?: string;
    memberCount?: number;
    founded?: string;
    description?: string;
    // Add other entity-specific fields as needed
}

// Route parameters
const route = useRoute();
const entityType = route.params.type as 'character' | 'corporation' | 'alliance';
const entityId = parseInt(route.params.id as string);

// Internationalization
const { t } = useI18n();

// Domain context
const { isCustomDomain, customDomain, entityType: domainEntityType, entity: domainEntity } = useDomainContext();

// SEO optimization for custom domains
const { optimizeCustomDomainSeo, setDomainPageSeo, generateCustomDomainOgImage, generateDomainBreadcrumbs } = useDomainSeo();

// Active tab management
const activeTab = ref('overview');

// Fetch entity data
const { data: entity, pending, error } = await useFetch<EntityData>(`/api/${entityType}s/${entityId}`, {
    key: `entity-${entityType}-${entityId}`,
    default: () => null
});

// Entity name for SEO
const entityName = computed(() => entity.value?.name || 'Loading...');

// Entity avatar
const entityAvatar = computed(() => {
    if (!entity.value) return '';

    const baseUrl = 'https://images.evetech.net';
    const size = 256;

    switch (entityType) {
        case 'character':
            return `${baseUrl}/characters/${entityId}/portrait?size=${size}`;
        case 'corporation':
            return `${baseUrl}/corporations/${entityId}/logo?size=${size}`;
        case 'alliance':
            return `${baseUrl}/alliances/${entityId}/logo?size=${size}`;
        default:
            return '';
    }
});

// SEO optimization when entity data is available
watch(entity, (newEntity) => {
    if (newEntity) {
        // Generate breadcrumbs
        const breadcrumbs = [
            { name: 'Home', path: '/' },
            { name: t(entityType), path: `/${entityType}s` },
            { name: newEntity.name }
        ];

        generateDomainBreadcrumbs(breadcrumbs);

        // Set domain-specific SEO
        const description = newEntity.description ||
            `${newEntity.name} ${entityType} killboard - View detailed PVP statistics, recent kills, losses, and combat achievements in EVE Online.`;

        const keywords = [
            'EVE Online',
            'killboard',
            newEntity.name,
            entityType,
            'PVP statistics',
            'kills',
            'losses',
            'combat data',
            ...(newEntity.ticker ? [newEntity.ticker] : [])
        ];

        setDomainPageSeo({
            title: newEntity.name,
            description,
            keywords,
            entityInfo: newEntity,
            image: generateCustomDomainOgImage('entity', entityId)
        });

        // Optimize for custom domain
        if (isCustomDomain.value) {
            optimizeCustomDomainSeo(newEntity);
        }
    }
}, { immediate: true });

// Handle image loading errors
const handleImageError = (event: Event) => {
    const img = event.target as HTMLImageElement;
    img.src = '/images/default-entity-avatar.png'; // Fallback image
};

// Available tabs based on entity type and domain
const availableTabs = computed(() => {
    const baseTabs = [
        {
            key: 'overview',
            label: t('overview'),
            icon: 'i-heroicons-home'
        },
        {
            key: 'killmails',
            label: t('killmails'),
            icon: 'i-heroicons-fire'
        },
        {
            key: 'stats',
            label: t('statistics'),
            icon: 'i-heroicons-chart-bar'
        }
    ];

    // Add campaigns tab for custom domains
    if (isCustomDomain.value) {
        baseTabs.splice(2, 0, {
            key: 'campaigns',
            label: t('campaigns.title'),
            icon: 'i-heroicons-flag'
        });
    }

    // Add members tab for corporations and alliances
    if (['corporation', 'alliance'].includes(entityType)) {
        baseTabs.push({
            key: 'members',
            label: t('members'),
            icon: 'i-heroicons-users'
        });
    }

    return baseTabs;
});

// Entity type color mapping
const getEntityTypeColor = (type: string) => {
    switch (type) {
        case 'character':
            return 'primary';
        case 'corporation':
            return 'success';
        case 'alliance':
            return 'warning';
        default:
            return 'neutral';
    }
};

// Utility functions
const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
};

// Error handling
if (error.value) {
    throw createError({
        statusCode: error.value.statusCode || 404,
        statusMessage: error.value.statusMessage || 'Entity not found'
    });
}

// Handle custom domain matching
onMounted(async () => {
    // If this is a custom domain, ensure the entity matches
    if (isCustomDomain.value && domainEntity.value) {
        if (domainEntityType.value !== entityType || domainEntity.value.id !== entityId) {
            // Redirect to the correct entity for this domain
            await navigateTo(`/entity/${domainEntityType.value}/${domainEntity.value.id}`);
            return;
        }
    }
});
</script>

<style scoped>
.entity-page {
    min-height: 100vh;
}

.entity-header {
    position: relative;
}

/* Custom domain specific styles */
.entity-page[data-custom-domain="true"] {
    /* Custom domain styling can be applied here */
}
</style>
