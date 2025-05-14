<template>
    <div class="p-4 bg-background-800 shadow-lg rounded-lg border border-gray-700/30">
        <h2 class="text-lg font-bold mb-4">{{ title }}</h2>

        <div v-if="entities.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="(entity, index) in entities" :key="index" class="entity-card">
                <div class="entity-header">
                    <div class="entity-avatar">
                        <Image :type="entityType" :id="entity.id" :size="32" class="avatar" />
                    </div>
                    <div class="entity-info">
                        <div class="entity-name">{{ entity.name }}</div>
                        <div class="entity-stats">
                            <span class="kills">{{ entity.kills }}</span>
                            <span class="separator">/</span>
                            <span class="losses">{{ entity.losses || 0 }}</span>
                        </div>
                    </div>
                    <div class="entity-efficiency" :class="getEfficiencyColorClass(calculateEfficiency(entity))">
                        {{ formatPercentage(calculateEfficiency(entity)) }}
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="empty-state">
            {{ t('campaign.no_entities_found') }}
        </div>
    </div>
</template>

<script setup lang="ts">
// Props
const props = defineProps<{
    title: string;
    entities: Array<{
        id: number;
        name: string;
        kills: number;
        losses?: number;
        iskDestroyed?: number;
        damageDone?: number;
    }>;
    entityType: 'character' | 'corporation' | 'alliance' | 'faction';
}>();

// Composables
const { t } = useI18n();
const { locale } = useI18n();

// Computed
const calculateEfficiency = (entity: { kills: number, losses?: number }): number => {
    const losses = entity.losses || 0;
    if (entity.kills === 0 && losses === 0) return 0;
    return entity.kills / (entity.kills + losses);
};

// Helpers
const formatPercentage = (value: number): string => {
    return new Intl.NumberFormat(locale.value, {
        style: 'percent',
        maximumFractionDigits: 1
    }).format(value);
};

const getEfficiencyColorClass = (efficiency: number): string => {
    if (efficiency >= 0.75) return 'text-green-500';
    if (efficiency >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
};
</script>

<style scoped>
.entity-card {
    background-color: var(--background-700);
    padding: 0.75rem;
    border-radius: 0.375rem;
}

.entity-header {
    display: flex;
    align-items: center;
}

.entity-avatar {
    margin-right: 0.75rem;
}

.avatar {
    border-radius: 9999px;
}

.entity-info {
    flex: 1;
}

.entity-name {
    font-weight: 500;
}

.entity-stats {
    font-size: 0.875rem;
}

.kills {
    color: #10b981;
}

.separator {
    margin-left: 0.25rem;
    margin-right: 0.25rem;
    color: #9ca3af;
}

.losses {
    color: #ef4444;
}

.entity-efficiency {
    font-weight: 700;
    font-size: 1.125rem;
    margin-left: 0.5rem;
}

.text-green-500 {
    color: #10b981;
}

.text-yellow-500 {
    color: #f59e0b;
}

.text-red-500 {
    color: #ef4444;
}

.empty-state {
    text-align: center;
    color: #9ca3af;
    padding-top: 1rem;
    padding-bottom: 1rem;
}
</style>
