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
                    <div v-if="shouldShowColumnOnMobile.memberCount" class="text-right">
                        {{ t('historicalStats.members') }}
                    </div>

                    <!-- Change headers -->
                    <div v-if="shouldShowColumnOnMobile.change1d" class="text-right">{{ t('historicalStats.change1d') }}</div>
                    <div v-if="shouldShowColumnOnMobile.change7d" class="text-right">{{ t('historicalStats.change7d') }}</div>
                    <div v-if="shouldShowColumnOnMobile.change14d" class="text-right">{{ t('historicalStats.change14d') }}</div>
                    <div v-if="shouldShowColumnOnMobile.change30d" class="text-right">{{ t('historicalStats.change30d') }}</div>

                    <!-- Security status header -->
                    <div v-if="shouldShowColumnOnMobile.secStatus" class="text-right">
                        {{ t('historicalStats.secStatus') }}
                    </div>

                    <!-- Date founded header -->
                    <div v-if="shouldShowColumnOnMobile.dateFounded" class="text-right">
                        {{ t('historicalStats.founded') }}
                    </div>

                    <!-- Achievement points header -->
                    <div v-if="shouldShowColumnOnMobile.achievementPoints" class="text-right">
                        {{ t('historicalStats.achievementPoints') }}
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
                        <div v-if="shouldShowColumnOnMobile.memberCount" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                        <div v-if="shouldShowColumnOnMobile.change1d" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                        <div v-if="shouldShowColumnOnMobile.change7d" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                        <div v-if="shouldShowColumnOnMobile.change14d" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                        <div v-if="shouldShowColumnOnMobile.change30d" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                        <div v-if="shouldShowColumnOnMobile.secStatus" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                        <div v-if="shouldShowColumnOnMobile.dateFounded" class="h-4 bg-gray-700 rounded animate-pulse"></div>
                        <div v-if="shouldShowColumnOnMobile.achievementPoints" class="h-4 bg-gray-700 rounded animate-pulse"></div>
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
                        <div v-if="shouldShowColumnOnMobile.memberCount" class="text-right">
                            {{ formatNumber(item.member_count) }}
                        </div>

                        <!-- Changes -->
                        <div v-if="shouldShowColumnOnMobile.change1d" :class="getChangeClass(item.change_1d)" class="text-right">
                            {{ formatChange(item.change_1d) }}
                        </div>
                        <div v-if="shouldShowColumnOnMobile.change7d" :class="getChangeClass(item.change_7d)" class="text-right">
                            {{ formatChange(item.change_7d) }}
                        </div>
                        <div v-if="shouldShowColumnOnMobile.change14d" :class="getChangeClass(item.change_14d)" class="text-right">
                            {{ formatChange(item.change_14d) }}
                        </div>
                        <div v-if="shouldShowColumnOnMobile.change30d" :class="getChangeClass(item.change_30d)" class="text-right">
                            {{ formatChange(item.change_30d) }}
                        </div>

                        <!-- Security status -->
                        <div v-if="shouldShowColumnOnMobile.secStatus" :class="getSecStatusClass(item.avg_sec_status)"
                            class="text-right">
                            {{ formatSecStatus(item.avg_sec_status) }}
                        </div>

                        <!-- Date founded -->
                        <div v-if="shouldShowColumnOnMobile.dateFounded" class="text-right">
                            {{ formatDate(item.date_founded) }}
                        </div>

                        <!-- Achievement points -->
                        <div v-if="shouldShowColumnOnMobile.achievementPoints" class="text-right">
                            {{ formatNumber(item.total_achievement_points || item.avg_achievement_points || 0) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import { computed, onMounted, onUnmounted, ref } from 'vue';
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
    total_achievement_points?: number;
    avg_achievement_points?: number;
}

const props = defineProps({
    entityType: { type: String as () => 'alliance' | 'corporation', required: true },
    listType: {
        type: String as () => 'largest' | 'growing' | 'newest' | 'shrinking' | 'most_pirate' | 'most_carebear' | 'dead' | 'highest_achievement_points' | 'lowest_achievement_points',
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
    showAchievementPoints: { type: Boolean, default: false },
});

const { t } = useI18n();

// Mobile detection
const isMobile = ref(false);

// Check if we're on mobile
const checkMobile = () => {
    if (typeof window !== 'undefined') {
        isMobile.value = window.innerWidth < 768; // md breakpoint
    }
};

onMounted(() => {
    checkMobile();
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', checkMobile);
    }
    refresh();
});

onUnmounted(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkMobile);
    }
});

// Mobile column visibility logic
const shouldShowColumnOnMobile = computed(() => {
    if (!isMobile.value) {
        // On desktop, show all columns as configured by props
        return {
            memberCount: props.showMemberCount,
            change1d: props.showChanges,
            change7d: props.showChanges && showDetailedChanges.value,
            change14d: props.showChanges && showDetailedChanges.value,
            change30d: props.showChanges && showDetailedChanges.value,
            secStatus: props.showSecStatus,
            dateFounded: props.showDateFounded,
            achievementPoints: props.showAchievementPoints,
        };
    }

    // On mobile, show only relevant columns based on list type
    const mobileColumns = {
        memberCount: false,
        change1d: false,
        change7d: false,
        change14d: false,
        change30d: false,
        secStatus: false,
        dateFounded: false,
        achievementPoints: false,
    };

    switch (props.listType) {
        case 'largest':
            // For largest, show only member count
            mobileColumns.memberCount = props.showMemberCount;
            break;
        case 'most_pirate':
        case 'most_carebear':
            // For security rankings, show only sec status
            mobileColumns.secStatus = props.showSecStatus;
            break;
        case 'newest':
            // For newest, show only founded date
            mobileColumns.dateFounded = props.showDateFounded;
            break;
        case 'growing':
        case 'shrinking':
            // For growing/shrinking, show only the relevant period
            if (props.period === '1d') {
                mobileColumns.change1d = props.showChanges;
            } else if (props.period === '7d') {
                mobileColumns.change7d = props.showChanges;
            } else if (props.period === '14d') {
                mobileColumns.change14d = props.showChanges;
            } else if (props.period === '30d') {
                mobileColumns.change30d = props.showChanges;
            }
            break;
        case 'highest_achievement_points':
        case 'lowest_achievement_points':
            // For achievement rankings, show only achievement points
            mobileColumns.achievementPoints = props.showAchievementPoints;
            break;
    }

    return mobileColumns;
});

const showDetailedChanges = computed(() => {
    // Only show detailed changes for growing/shrinking lists and largest on desktop
    if (isMobile.value) {
        // On mobile, detailed changes are handled by shouldShowColumnOnMobile
        return false;
    }
    return props.showChanges &&
        (props.listType === 'growing' || props.listType === 'shrinking' || props.listType === 'largest');
});

// Calculate number of columns to determine grid layout
const columnCount = computed(() => {
    let count = 0;
    const columns = shouldShowColumnOnMobile.value;

    if (columns.memberCount) count++;
    if (columns.change1d) count++;
    if (columns.change7d) count++;
    if (columns.change14d) count++;
    if (columns.change30d) count++;
    if (columns.secStatus) count++;
    if (columns.dateFounded) count++;
    if (columns.achievementPoints) count++;

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

onMounted(() => {
    checkMobile();
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', checkMobile);
    }
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
