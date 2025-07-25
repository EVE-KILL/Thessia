<template>
    <div class="monthly-history-container">
        <div v-if="loading" class="loading-state">
            <Table :columns="tableColumns" :items="[]" :loading="true" :skeleton-count="12" />
        </div>

        <div v-else-if="stats.monthlyStats && stats.monthlyStats.length > 0" class="monthly-history-table">
            <Table :columns="tableColumns" :items="stats.monthlyStats" :density="'compact'"
                :striped="true" :bordered="true" background="default">
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
                            <div class="efficiency-fill"
                                :style="{ width: `${item.efficiency}%` }"
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
            <div class="text-center py-8">
                <UIcon name="i-lucide-calendar" class="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p class="text-gray-500">{{ t('alliance.noMonthlyStats') }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Props
interface MonthlyStats {
    monthlyStats: Array<{
        year: number;
        month: number;
        monthLabel: string;
        kills: number;
        iskKilled: number;
        losses: number;
        iskLost: number;
        efficiency: number;
    }>;
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
.monthly-history-container {
    /* Clean container styling */
}

.monthly-history-table {
    background: light-dark(#ffffff, #1a1a1a);
    border-radius: 0.5rem;
    overflow: hidden;
    border: 1px solid light-dark(#e5e7eb, #374151);
}

/* Month styling */
.month-container {
    font-weight: 600;
    padding: 0.5rem;
}

/* Stat value styling */
.stat-value {
    padding: 0.5rem;
    text-align: right;
    font-weight: 500;
}

.killed {
    color: #10b981; /* green */
}

.lost {
    color: #ef4444; /* red */
}

.isk-killed {
    color: #3b82f6; /* blue */
}

.isk-lost {
    color: #f59e0b; /* amber */
}

/* Efficiency styling */
.efficiency-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    gap: 0.25rem;
}

.efficiency-value {
    font-weight: 600;
    font-size: 0.875rem;
}

.efficiency-bar {
    width: 100%;
    height: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    border-radius: 2px;
    overflow: hidden;
}

.efficiency-fill {
    height: 100%;
    transition: width 0.3s ease;
}

.high-efficiency {
    color: #10b981; /* green - 75%+ */
}

.high-efficiency.efficiency-fill {
    background-color: #10b981;
}

.medium-efficiency {
    color: #f59e0b; /* yellow - 50-74% */
}

.medium-efficiency.efficiency-fill {
    background-color: #f59e0b;
}

.low-efficiency {
    color: #ef4444; /* red - <50% */
}

.low-efficiency.efficiency-fill {
    background-color: #ef4444;
}

/* Row hover effect */
:deep(tbody tr:hover) {
    background: light-dark(#f9fafb, #1f2937);
}

/* Empty state styling */
.empty-state {
    text-align: center;
    color: #9ca3af;
    padding: 2rem 0;
}

/* Mobile view styling */
.mobile-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0.5rem;
}

.mobile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid light-dark(#e5e7eb, #374151);
}

.mobile-title {
    font-weight: 600;
    font-size: 1rem;
}

.efficiency-badge {
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.1));
}

.mobile-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.mobile-stat-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
}

.mobile-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    font-size: 0.875rem;
}

.stat-label {
    color: #9ca3af;
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Loading state */
.loading-state {
    opacity: 0.7;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .monthly-history-table {
        border-radius: 0.25rem;
    }
}
</style>
