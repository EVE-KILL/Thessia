<template>
    <Card class="monthly-history-card">
        <template #header>
            <div class="monthly-history-header">
                <h3 class="history-title">{{ t('character.monthlyHistory') }}</h3>
                <p class="history-description">{{ t('character.monthlyHistoryDescription') }}</p>
            </div>
        </template>

        <div v-if="loading" class="loading-state">
            <Table :columns="tableColumns" :items="[]" :loading="true" :skeleton-count="12" />
        </div>

        <div v-else-if="stats.monthlyStats && stats.monthlyStats.length > 0">
            <Table :columns="tableColumns" :items="stats.monthlyStats" :density="'compact'" :striped="true"
                :bordered="true" background="transparent">
                <template #cell-month="{ item }">
                    <div class="month-container">
                        {{ item.monthLabel }}
                    </div>
                </template>
                <template #cell-kills="{ item }">
                    <div class="stat-value killed">
                        {{ formatNumber(item.kills) }}
                    </div>
                </template>
                <template #cell-iskKilled="{ item }">
                    <div class="stat-value isk-killed">
                        {{ formatISK(item.iskKilled) }}
                    </div>
                </template>
                <template #cell-losses="{ item }">
                    <div class="stat-value lost">
                        {{ formatNumber(item.losses) }}
                    </div>
                </template>
                <template #cell-iskLost="{ item }">
                    <div class="stat-value isk-lost">
                        {{ formatISK(item.iskLost) }}
                    </div>
                </template>
                <template #cell-efficiency="{ item }">
                    <div class="efficiency-container">
                        <span class="efficiency-value" :class="getEfficiencyClass(item.efficiency)">
                            {{ item.efficiency }}%
                        </span>
                        <div class="efficiency-bar">
                            <div class="efficiency-fill" :style="{ width: `${item.efficiency}%` }"
                                :class="getEfficiencyClass(item.efficiency)">
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Mobile view template -->
                <template #mobile-content="{ item }">
                    <div class="mobile-content">
                        <div class="mobile-header">
                            <span class="mobile-title">{{ item.monthLabel }}</span>
                            <span class="efficiency-badge" :class="getEfficiencyClass(item.efficiency)">
                                {{ item.efficiency }}%
                            </span>
                        </div>
                        <div class="mobile-stats">
                            <div class="mobile-stat-row">
                                <div class="mobile-stat">
                                    <span class="stat-label">{{ t('kills') }}:</span>
                                    <span class="killed">{{ formatNumber(item.kills) }}</span>
                                </div>
                                <div class="mobile-stat">
                                    <span class="stat-label">{{ t('losses') }}:</span>
                                    <span class="lost">{{ formatNumber(item.losses) }}</span>
                                </div>
                            </div>
                            <div class="mobile-stat-row">
                                <div class="mobile-stat">
                                    <span class="stat-label">{{ t('iskKilled') }}:</span>
                                    <span class="isk-killed">{{ formatISK(item.iskKilled) }}</span>
                                </div>
                                <div class="mobile-stat">
                                    <span class="stat-label">{{ t('iskLost') }}:</span>
                                    <span class="isk-lost">{{ formatISK(item.iskLost) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </Table>
        </div>

        <div v-else class="empty-state">
            <div class="empty-content">
                <UIcon name="i-lucide-calendar" class="empty-icon" />
                <p class="empty-text">{{ t('character.noMonthlyStats') }}</p>
            </div>
        </div>
    </Card>
</template>

<script setup lang="ts">

// Types
interface MonthlyStatItem {
    year: number;
    month: number;
    monthLabel: string;
    kills: number;
    iskKilled: number;
    losses: number;
    iskLost: number;
    efficiency: number;
}

// Props
interface MonthlyStats {
    monthlyStats: MonthlyStatItem[];
}

const props = defineProps<{
    stats: MonthlyStats;
    loading?: boolean;
}>();

// Composables
const { t } = useI18n();

// Table column definitions
const tableColumns = [
    {
        id: "month",
        header: t('month'),
        width: "20%"
    },
    {
        id: "kills",
        header: t('kills'),
        width: "15%"
    },
    {
        id: "iskKilled",
        header: t('iskKilled'),
        width: "20%"
    },
    {
        id: "losses",
        header: t('losses'),
        width: "15%"
    },
    {
        id: "iskLost",
        header: t('iskLost'),
        width: "20%"
    },
    {
        id: "efficiency",
        header: t('efficiency'),
        width: "10%"
    }
];

// Helper functions
const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
};

const formatISK = (isk: number): string => {
    if (isk >= 1e12) {
        return `${(isk / 1e12).toFixed(1)}T`;
    } else if (isk >= 1e9) {
        return `${(isk / 1e9).toFixed(1)}B`;
    } else if (isk >= 1e6) {
        return `${(isk / 1e6).toFixed(1)}M`;
    } else if (isk >= 1e3) {
        return `${(isk / 1e3).toFixed(1)}K`;
    }
    return isk.toString();
};

const getEfficiencyClass = (efficiency: number): string => {
    if (efficiency >= 75) return 'high-efficiency';
    if (efficiency >= 50) return 'medium-efficiency';
    return 'low-efficiency';
};
</script>

<style scoped>
.monthly-history-card {
    overflow: hidden;
}

/* Header */
.monthly-history-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.history-title {
    font-size: var(--text-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
}

.history-description {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    margin: 0;
}

/* Month styling */
.month-container {
    font-weight: var(--font-weight-semibold);
    padding: var(--space-2);
}

/* Stat value styling */
.stat-value {
    padding: var(--space-2);
    text-align: right;
    font-weight: var(--font-weight-medium);
}

.killed {
    color: var(--color-success-500);
}

.lost {
    color: var(--color-error-500);
}

.isk-killed {
    color: var(--color-brand-primary);
}

.isk-lost {
    color: var(--color-warning-500);
}

/* Efficiency styling */
.efficiency-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2);
    gap: var(--space-1);
}

.efficiency-value {
    font-weight: var(--font-weight-semibold);
    font-size: var(--text-sm);
}

.efficiency-bar {
    width: 100%;
    height: 4px;
    background-color: var(--color-surface-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
}

.efficiency-fill {
    height: 100%;
    transition: width var(--duration-normal) ease;
}

.high-efficiency {
    color: var(--color-success-500);
}

.high-efficiency.efficiency-fill {
    background-color: var(--color-success-500);
}

.medium-efficiency {
    color: var(--color-warning-500);
}

.medium-efficiency.efficiency-fill {
    background-color: var(--color-warning-500);
}

.low-efficiency {
    color: var(--color-error-500);
}

.low-efficiency.efficiency-fill {
    background-color: var(--color-error-500);
}

/* Row hover effect */
:deep(tbody tr:hover) {
    background: var(--color-surface-hover);
}

/* Empty state styling */
.empty-state {
    text-align: center;
    padding: var(--space-8) 0;
}

.empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
}

.empty-icon {
    width: var(--space-12);
    height: var(--space-12);
    color: var(--color-text-muted);
}

.empty-text {
    color: var(--color-text-muted);
    margin: 0;
}

/* Mobile view styling */
.mobile-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: var(--space-2);
}

.mobile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border-default);
}

.mobile-title {
    font-weight: var(--font-weight-semibold);
    font-size: var(--text-base);
}

.efficiency-badge {
    font-weight: var(--font-weight-semibold);
    font-size: var(--text-sm);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--color-surface-alpha);
}

.mobile-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.mobile-stat-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
}

.mobile-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    font-size: var(--text-sm);
}

.stat-label {
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-1);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);
}

/* Loading state */
.loading-state {
    opacity: var(--opacity-disabled);
}
</style>
