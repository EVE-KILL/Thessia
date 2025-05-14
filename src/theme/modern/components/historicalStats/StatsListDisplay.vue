<template>
    <div class="stats-list-container pb-5">
        <div class="stats-title text-lg font-medium mb-2 text-center">{{ props.title }}</div>
        <div class="stats-table bg-gray-900 rounded overflow-hidden">
            <!-- Table Header -->
            <div class="stats-header flex bg-gray-800 text-gray-400 text-xs font-semibold py-2 px-3">
                <div class="w-[7%] flex items-center pl-2">#</div>
                <div class="w-[43%] flex items-center">{{ t('historicalStats.entity') }}</div>
                <div class="w-[50%] grid" :class="getColumnsClass()">
                    <!-- Member count header -->
                    <div v-if="props.showMemberCount" class="text-right">
                        {{ t('historicalStats.members') }}
                    </div>

                    <!-- Change headers -->
                    <template v-if="props.showChanges">
                        <div class="text-right">{{ t('historicalStats.change1d') }}</div>
                        <div v-if="showDetailedChanges" class="text-right">{{ t('historicalStats.change7d') }}</div>
                        <div v-if="showDetailedChanges" class="text-right">{{ t('historicalStats.change14d') }}</div>
                        <div v-if="showDetailedChanges" class="text-right">{{ t('historicalStats.change30d') }}</div>
                    </template>

                    <!-- Security status header -->
                    <div v-if="props.showSecStatus" class="text-right">
                        {{ t('historicalStats.secStatus') }}
                    </div>

                    <!-- Date founded header -->
                    <div v-if="props.showDateFounded" class="text-right">
                        {{ t('historicalStats.founded') }}
                    </div>
                </div>
            </div>

            <!-- Loading Skeleton -->
            <div v-if="pending" class="stats-body">
                <div v-for="i in props.limit" :key="`skeleton-${i}`"
                    class="stats-row flex items-center py-2 px-3 border-t border-gray-800">
                    <div class="w-[7%] text-left pl-2 font-medium text-gray-500">{{ i }}</div>
                    <div class="w-[43%] flex items-center">
                        <div class="w-8 h-8 bg-gray-700 rounded-full mr-3 animate-pulse"></div>
                        <div class="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div class="w-[50%] grid" :class="getColumnsClass()">
                        <div v-if="props.showMemberCount" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                        <template v-if="props.showChanges">
                            <div class="h-4 bg-gray-700 rounded animate-pulse"></div>
                            <div v-if="showDetailedChanges" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                            <div v-if="showDetailedChanges" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                            <div v-if="showDetailedChanges" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                        </template>
                        <div v-if="props.showSecStatus" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                        <div v-if="props.showDateFounded" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                </div>
            </div>

            <!-- Error Message -->
            <div v-else-if="error" class="stats-error p-4 text-center text-red-400">
                {{ t('common.error') }}: {{ error.message }}
            </div>

            <!-- No Data Message -->
            <div v-else-if="!statsData?.length" class="stats-empty p-4 text-center text-gray-400">
                {{ t('historicalStats.noData') }}
            </div>

            <!-- Actual Data Rows -->
            <div v-else class="stats-body">
                <div v-for="(item, idx) in statsData" :key="`entity-${item.id}-${idx}`"
                    class="stats-row flex items-center py-2 px-3 border-t border-gray-800 hover:bg-gray-800">
                    <div class="w-[7%] text-left pl-2 font-medium text-gray-400">{{ idx + 1 }}</div>
                    <div class="w-[43%] flex items-center">
                        <NuxtLink :to="`/${props.entityType}/${item.id}`" class="flex items-center">
                            <Image :type="props.entityType" :id="item.id" :alt="`${item.name}`"
                                class="w-8 h-8 mr-3 rounded-full" size="64" format="webp" />
                            <span class="entity-name truncate">{{ item.name }}</span>
                        </NuxtLink>
                    </div>
                    <div class="w-[50%] grid" :class="getColumnsClass()">
                        <!-- Member count -->
                        <div v-if="props.showMemberCount" class="text-right">
                            {{ formatNumber(item.member_count) }}
                        </div>

                        <!-- Changes -->
                        <template v-if="props.showChanges">
                            <div :class="getChangeClass(item.change_1d)" class="text-right">
                                {{ formatChange(item.change_1d) }}
                            </div>
                            <div v-if="showDetailedChanges" :class="getChangeClass(item.change_7d)" class="text-right">
                                {{ formatChange(item.change_7d) }}
                            </div>
                            <div v-if="showDetailedChanges" :class="getChangeClass(item.change_14d)" class="text-right">
                                {{ formatChange(item.change_14d) }}
                            </div>
                            <div v-if="showDetailedChanges" :class="getChangeClass(item.change_30d)" class="text-right">
                                {{ formatChange(item.change_30d) }}
                            </div>
                        </template>

                        <!-- Security status -->
                        <div v-if="props.showSecStatus" :class="getSecStatusClass(item.avg_sec_status)"
                            class="text-right">
                            {{ formatSecStatus(item.avg_sec_status) }}
                        </div>

                        <!-- Date founded -->
                        <div v-if="props.showDateFounded" class="text-right">
                            {{ formatDate(item.date_founded) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

interface IStatEntity {
    id: number;
    name: string;
    type: string;
    member_count?: number;
    change_1d?: number | null;
    change_7d?: number | null;
    change_14d?: number | null;
    change_30d?: number | null;
    pirate_members?: number;
    carebear_members?: number;
    sum_sec_status?: number;
    avg_sec_status?: number;  // Added average security status
    weighted_score?: number; // Add this field
    date_founded?: string | Date;
    last_active?: string | Date;
}

const props = defineProps({
    entityType: { type: String as () => 'alliance' | 'corporation', required: true },
    listType: {
        type: String as () => 'largest' | 'growing' | 'newest' | 'shrinking' | 'most_pirate' | 'most_carebear' | 'dead',
        required: true,
    },
    period: { type: String as () => '1d' | '7d' | '14d' | '30d', default: '7d' },
    title: { type: String, required: true },
    limit: { type: Number, default: 10 },
    sort: { type: String, default: 'default' },
    showMemberCount: { type: Boolean, default: true },
    showChanges: { type: Boolean, default: false },
    showSecStatus: { type: Boolean, default: false },
    showDateFounded: { type: Boolean, default: false },
});

const { t } = useI18n();

const showDetailedChanges = computed(() => {
    // Only show detailed changes for growing/shrinking lists
    return props.showChanges &&
        (props.listType === 'growing' || props.listType === 'shrinking' || props.listType === 'largest');
});

// Calculate number of columns to determine grid layout
const columnCount = computed(() => {
    let count = 0;
    if (props.showMemberCount) count++;
    if (props.showChanges) {
        count++; // 1d change
        if (showDetailedChanges.value) count += 3; // 7d, 14d, 30d changes
    }
    if (props.showSecStatus) count++;
    if (props.showDateFounded) count++;
    return count;
});

// Generate appropriate grid template columns CSS class
const getColumnsClass = () => {
    const cols = columnCount.value;
    if (cols === 1) return 'grid-cols-1';
    if (cols === 2) return 'grid-cols-2 gap-x-3';
    if (cols === 3) return 'grid-cols-3 gap-x-2';
    if (cols === 4) return 'grid-cols-4 gap-x-2';
    if (cols === 5) return 'grid-cols-5 gap-x-1';
    return 'grid-cols-1';  // Default fallback
};

const queryParams = computed(() => {
    const params: Record<string, string | number> = {
        entityType: props.entityType,
        listType: props.listType,
        limit: props.limit,
    };

    if ((props.listType === 'growing' || props.listType === 'shrinking') && props.period) {
        params.period = props.period;
    }

    if (props.sort !== 'default') {
        params.sort = props.sort;
    }

    return params;
});

const {
    data: statsData,
    pending,
    error,
    refresh
} = useFetch<IStatEntity[]>('/api/historicalstats/entities', {
    query: queryParams,
    key: `historicalStats-${props.entityType}-${props.listType}-${props.period}-${props.limit}-${props.title}-${props.sort}`,
});

// Refresh on mount to ensure we have the latest data
onMounted(() => {
    refresh();
});

const formatNumber = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat().format(value);
};

const formatChange = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '–';
    return (value > 0 ? '+' : '') + new Intl.NumberFormat().format(value);
};

const formatDate = (dateValue: string | Date | undefined | null): string => {
    if (!dateValue) return 'N/A';
    try {
        const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
        // Check for epoch date (1970-01-01) and treat as invalid
        if (date.getFullYear() <= 1970) return 'N/A';
        return format(date, 'yyyy-MM-dd');
    } catch (e) {
        return 'Invalid Date';
    }
};

const formatSecStatus = (value: number | undefined | null): string => {
    if (value === undefined || value === null || value === 0) return '0.00';
    return value.toFixed(2);
};

const formatScore = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    return value.toFixed(2);
};

const getChangeClass = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return 'text-gray-400';
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-gray-400';
};

const getSecStatusClass = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return 'text-gray-400';
    if (value > 0) return 'text-blue-400';  // Carebear
    if (value < 0) return 'text-red-400';   // Pirate
    return 'text-gray-400';
};

const showWeightedScore = computed(() => {
    return props.listType === 'most_pirate' || props.listType === 'most_carebear';
});
</script>

<style scoped>
.stats-list-container {
    background-color: rgba(17, 24, 39, 0.7);
    border-radius: 0.5rem;
    overflow: hidden;
    height: 100%;
}

.stats-title {
    color: #e2e8f0;
    padding: 0.75rem;
}

.stats-row:hover {
    background-color: rgba(55, 65, 81, 0.5);
}

.entity-name {
    max-width: 180px;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.entity-name:hover {
    text-decoration: underline;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 0.7;
    }

    50% {
        opacity: 0.4;
    }
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Make sure the container has proper height to prevent layout shifts */
.stats-list-container {
    min-height: 480px;
    display: flex;
    flex-direction: column;
}

.stats-table {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.stats-body {
    flex: 1;
}
</style>
