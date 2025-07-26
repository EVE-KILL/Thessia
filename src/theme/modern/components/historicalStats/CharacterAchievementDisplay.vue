<template>
    <div class="stats-list-container pb-5">
        <div class="stats-title text-lg font-medium mb-2 text-center">{{ props.title }}</div>
        <div class="stats-table bg-gray-900 rounded overflow-hidden">
            <!-- Table Header -->
            <div class="stats-header flex bg-gray-800 text-gray-400 text-xs font-semibold py-2 px-3">
                <div class="w-[7%] flex items-center pl-2">#</div>
                <div class="w-[68%] flex items-center">{{ t('historicalStats.character') }}</div>
                <div class="w-[25%] flex items-center text-right">{{ t('historicalStats.achievementPoints') }}</div>
            </div>

            <!-- Loading Skeleton -->
            <div v-if="pending" class="stats-body">
                <div v-for="i in props.limit" :key="`skeleton-${i}`"
                    class="stats-row flex items-center py-2 px-3 border-t border-gray-800">
                    <div class="w-[7%] text-left pl-2 font-medium text-gray-500">{{ i }}</div>
                    <div class="w-[68%] flex items-center">
                        <div class="w-8 h-8 bg-gray-700 rounded-full mr-3 animate-pulse"></div>
                        <div class="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div class="w-[25%] text-right">
                        <div class="h-4 w-16 bg-gray-700 rounded animate-pulse ml-auto"></div>
                    </div>
                </div>
            </div>

            <!-- Error Message -->
            <div v-else-if="error" class="stats-error p-4 text-center text-red-400">
                {{ t('historicalStats.errorLoading') }}
            </div>

            <!-- Actual Data Rows -->
            <div v-else class="stats-body">
                <div v-for="(item, idx) in achievementData" :key="`character-${item.character_id}-${idx}`"
                    class="stats-row flex items-center py-2 px-3 border-t border-gray-800 hover:bg-gray-800">
                    <div class="w-[7%] text-left pl-2 font-medium text-gray-400">{{ idx + 1 }}</div>
                    <div class="w-[68%] flex items-center">
                        <NuxtLink :to="`/character/${item.character_id}`" class="flex items-center">
                            <Image type="character" :id="item.character_id" :alt="`${item.character_name}`"
                                class="w-8 h-8 mr-3 rounded-full" size="64" format="webp" />
                            <span class="character-name truncate">{{ item.character_name }}</span>
                        </NuxtLink>
                    </div>
                    <div class="w-[25%] text-right">
                        <span class="font-medium">{{ formatNumber(item.total_points) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface ICharacterAchievement {
    character_id: number;
    character_name: string;
    corporation_id?: number;
    corporation_name?: string;
    alliance_id?: number;
    alliance_name?: string;
    total_points: number;
}

const props = defineProps({
    listType: { type: String as () => 'highest' | 'lowest', required: true },
    title: { type: String, required: true },
    limit: { type: Number, default: 10 },
});

const { t } = useI18n();

const queryParams = computed(() => ({
    listType: `${props.listType}_character_points`,
    limit: props.limit,
}));

const {
    data: achievementData,
    pending,
    error,
    refresh
} = useFetch<ICharacterAchievement[]>('/api/historicalstats/achievements', {
    query: queryParams,
    key: `characterAchievements-${props.listType}-${props.limit}-${props.title}`,
});

const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
};
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

.character-name {
    max-width: 180px;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.character-name:hover {
    text-decoration: underline;
}

@keyframes pulse {
    0%, 100% {
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
