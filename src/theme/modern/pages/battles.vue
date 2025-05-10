<script setup lang="ts">
import moment from 'moment';
import { computed, ref, watch } from 'vue';
import type { IBattlesDocument } from '~/server/interfaces/IBattles';

const { t, locale } = useI18n();
const router = useRouter();
const currentLocale = computed(() => locale.value);

const currentPage = ref(1);
const pageSizeItems = [
    { label: "10", value: 10 },
    { label: "25", value: 25 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
];
const selectedPageSize = ref(pageSizeItems[0].value);

const queryParams = computed(() => ({
    page: currentPage.value,
    limit: selectedPageSize.value,
}));

interface BattlesApiResponse {
    battles: IBattlesDocument[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
}

const { data, pending, error, refresh } = useFetch<BattlesApiResponse>('/api/battles', {
    query: queryParams,
    key: 'battles-list',
});

const columns = [
    { id: 'time', header: computed(() => t('time', 'Time')), width: '25%' },
    { id: 'system', header: computed(() => t('system', 'System')), width: '20%' },
    { id: 'stats', header: computed(() => t('stats', 'Stats')), width: '25%' },
    { id: 'involved', header: computed(() => t('involved', 'Involved')), width: '30%' },
];

const battlesList = computed(() => data.value?.battles || []);
const totalItems = computed(() => data.value?.totalItems || 0);

moment.locale(currentLocale.value); // Set locale once

const formatTimeAgo = (date: string | Date): string => {
    moment.locale(currentLocale.value);
    return moment.utc(date).fromNow();
};

const formatDateDisplay = (date: string | Date): string => {
    moment.locale(currentLocale.value);
    return moment.utc(date).format('Do MMMM');
};

const formatYearDisplay = (date: string | Date): string => {
    moment.locale(currentLocale.value);
    return moment.utc(date).format('YYYY');
};

const formatTimeRange = (startTime: string | Date, endTime: string | Date | undefined): string => {
    moment.locale(currentLocale.value);
    const start = moment.utc(startTime).format('HH:mm');
    if (!endTime) return start;
    const end = moment.utc(endTime).format('HH:mm');
    return `${start} to ${end}`;
};

const formatDuration = (durationMs: number | undefined | null): string => {
    if (typeof durationMs !== 'number' || durationMs <= 0) return '-';
    const duration = moment.duration(durationMs);
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    let formatted = '';
    if (hours > 0) {
        formatted += `${hours}h`;
    }
    if (minutes > 0) {
        if (formatted) formatted += ' ';
        formatted += `${minutes}m`;
    }
    return formatted || '-';
};

const getInvolvedCounts = (battle: IBattlesDocument): { alliances: number; corps: number; chars: number } => {
    return {
        alliances: battle.alliancesInvolved?.length || 0,
        corps: battle.corporationsInvolved?.length || 0,
        chars: battle.charactersInvolved?.length || 0,
    };
};

const formatNumber = (n: number | undefined | null): string => {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const linkFn = (item: IBattlesDocument) => `/battle/${item.battle_id}`;
const goToBattle = (item: IBattlesDocument) => router.push(linkFn(item));

const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    // If the object itself is a string, return it directly (for non-localized fields)
    if (typeof obj === 'string') return obj;
    // Otherwise, attempt to get the localized string
    return obj[localeKey] || obj.en || "";
};

const goToSystem = (systemId: number) => router.push(`/system/${systemId}`);
const goToAlliance = (allianceId: number) => router.push(`/alliance/${allianceId}`);
const goToCorporation = (corporationId: number) => router.push(`/corporation/${corporationId}`);
const goToItem = (itemId: number) => router.push(`/item/${itemId}`);

const generateSkeletonRows = (count: number) => {
    return Array(count)
        .fill(0)
        .map((_, index) => ({
            id: `skeleton-${index}`,
            isLoading: true,
        }));
};
const skeletonRows = computed(() => generateSkeletonRows(selectedPageSize.value));

// Refresh on page/size change
watch([currentPage, selectedPageSize, currentLocale], () => {
    moment.locale(currentLocale.value);
    refresh();
});

// Track if the initial data load is pending
const initialPending = ref(true);

// When data is loaded the first time, set initialPending to false
watch(
    () => pending.value,
    (isPending, wasPending) => {
        if (wasPending && !isPending) {
            initialPending.value = false;
        }
    }
);

// Ensure initialPending is false if data is already loaded (e.g. SSR/hydration)
if (!pending.value) {
    initialPending.value = false;
}
</script>

<template>
    <div class="space-y-4">
        <h1 class="text-2xl font-bold">{{ t('battles', 'Battles') }}</h1>

        <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="red" variant="soft"
            :title="t('errorFetchingData', 'Error Fetching Data')" :description="error.message" />

        <div v-else class="space-y-4">
            <div class="flex justify-between items-center">
                <!-- Item Count (Left) -->
                <span class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('showingResults', {
                        start: totalItems > 0 ? (currentPage - 1) * selectedPageSize + 1 : 0,
                        end: Math.min(currentPage * selectedPageSize, totalItems),
                        total: totalItems
                    }, `Showing {start}-{end} of {total} battles`) }}
                </span>

                <!-- Pagination Controls (Right) -->
                <div class="flex items-center space-x-4">
                    <!-- Per Page Selector -->
                    <div class="flex items-center space-x-2">
                        <span class="text-sm">{{ t('perPage', 'Per Page:') }}</span>
                        <USelect v-model="selectedPageSize" :items="pageSizeItems" value-attribute="value"
                            option-attribute="label" size="xs" />
                    </div>
                    <!-- Pagination Component -->
                    <UPagination v-model:page="currentPage" :total="totalItems" :items-per-page="selectedPageSize"
                        :disabled="pending" size="sm" />
                </div>
            </div>

            <Table v-if="!pending && !initialPending" :key="'battles-table-data'" :columns="columns"
                :items="battlesList" :loading="false" :skeleton-count="selectedPageSize" :link-fn="linkFn"
                :bordered="true" :striped="false" :hover="true" density="normal" background="transparent"
                table-class="battles-table" :empty-text="t('noBattlesFound', 'No battles found.')"
                empty-icon="i-heroicons-circle-stack">
                <!-- Custom Cell Rendering -->
                <template #cell-time="{ item }">
                    <div class="text-sm space-y-0.5">
                        <NuxtLink :to="linkFn(item)" class="text-primary-500 hover:underline font-semibold block">
                            #{{ item.battle_id }}
                        </NuxtLink>
                        <UTooltip :text="moment.utc(item.start_time).format('YYYY-MM-DD HH:mm:ss UTC')">
                            <div>{{ formatTimeAgo(item.start_time) }}</div>
                        </UTooltip>
                        <div>{{ formatDateDisplay(item.start_time) }}, {{ formatYearDisplay(item.start_time) }}</div>
                        <div>{{ formatTimeRange(item.start_time, item.end_time) }}</div>
                        <div>{{ t('duration', 'Duration') }}: {{ formatDuration(item.duration_ms) }}</div>
                    </div>
                </template>

                <template #cell-system="{ item }">
                    <div class="flex items-center gap-2 cursor-pointer" @click.stop="goToSystem(item.system_id)">
                        <Image :id="item.system_id" type="system" size="32" format="webp"
                            class="w-8 h-8 rounded flex-shrink-0" />
                        <div class="text-sm">
                            <div class="hover:underline">{{ getLocalizedString(item.system_name, currentLocale) }} ({{
                                item.system_security?.toFixed(1) ?? 'N/A' }})</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">{{
                                getLocalizedString(item.region_name, currentLocale) }}</div>
                        </div>
                    </div>
                </template>

                <template #cell-stats="{ item }">
                    <div class="text-sm space-y-0.5">
                        <div>
                            <span class="font-semibold">{{ formatIsk(item.iskDestroyed) }}</span> {{
                                t('iskDestroyedShort', 'ISK') }} /
                            <span class="font-semibold">{{ formatNumber(item.killmailsCount) }}</span> {{ t('kmsShort',
                                'KMs') }}
                        </div>
                        <div>
                            <span class="font-semibold">{{ getInvolvedCounts(item).alliances }}</span> {{
                                t('alliancesShort', 'Alliances') }} /
                            <span class="font-semibold">{{ getInvolvedCounts(item).corps }}</span> {{
                                t('corporationsShort', 'Corps') }}
                        </div>
                        <div>
                            <span class="font-semibold">{{ getInvolvedCounts(item).chars }}</span> {{
                                t('charactersShort', 'Characters') }}
                        </div>
                    </div>
                </template>

                <template #cell-involved="{ item }">
                    <div class="space-y-1">
                        <!-- Row 1: Entities (Alliances/Corporations) -->
                        <div class="flex flex-wrap gap-1">
                            <template v-if="item.alliancesInvolved && item.alliancesInvolved.length > 0">
                                <template v-for="alliance in item.top_alliances?.slice(0, 10) || []"
                                    :key="`alliance-${alliance.id}`">
                                    <UTooltip
                                        :text="`${getLocalizedString(alliance.name, currentLocale)} (${alliance.count} pilots)`">
                                        <div class="cursor-pointer" @click.stop="goToAlliance(alliance.id)">
                                            <Image :id="alliance.id" type="alliance"
                                                :alt="getLocalizedString(alliance.name, currentLocale)" size="32"
                                                format="webp" class="w-8 h-8" :showCount="true" :count="alliance.count"
                                                countPosition="bottom-right" />
                                        </div>
                                    </UTooltip>
                                </template>
                            </template>
                            <template v-else>
                                <template v-for="corp in item.top_corporations?.slice(0, 10) || []"
                                    :key="`corp-${corp.id}`">
                                    <UTooltip
                                        :text="`${getLocalizedString(corp.name, currentLocale)} (${corp.count} pilots)`">
                                        <div class="cursor-pointer" @click.stop="goToCorporation(corp.id)">
                                            <Image :id="corp.id" type="corporation"
                                                :alt="getLocalizedString(corp.name, currentLocale)" size="32"
                                                format="webp" class="w-8 h-8" :showCount="true" :count="corp.count"
                                                countPosition="bottom-right" />
                                        </div>
                                    </UTooltip>
                                </template>
                            </template>
                        </div>
                        <!-- Row 2: Ships -->
                        <div class="flex flex-wrap gap-1">
                            <template v-for="ship in item.top_ship_types?.slice(0, 10) || []" :key="`ship-${ship.id}`">
                                <UTooltip :text="`${getLocalizedString(ship.name, currentLocale)} (${ship.count})`">
                                    <div class="cursor-pointer" @click.stop="goToItem(ship.id)">
                                        <Image :id="ship.id" type="item"
                                            :name="getLocalizedString(ship.name, currentLocale)"
                                            :alt="getLocalizedString(ship.name, currentLocale)" size="32" format="webp"
                                            class="w-8 h-8" :showCount="true" :count="ship.count"
                                            countPosition="bottom-right" />
                                    </div>
                                </UTooltip>
                            </template>
                        </div>
                    </div>
                </template>
            </Table>
            <Table v-else :key="'battles-table-skeleton'" :columns="columns" :items="skeletonRows" :loading="true"
                :skeleton-count="selectedPageSize" :link-fn="linkFn" :bordered="true" :striped="false" :hover="true"
                density="normal" background="transparent" table-class="battles-table"
                :empty-text="t('noBattlesFound', 'No battles found.')" empty-icon="i-heroicons-circle-stack">
                <template #skeleton>
                    <div class="battles-skeleton-container">
                        <div v-for="i in selectedPageSize" :key="`skeleton-${i}`" class="battles-skeleton-row">
                            <!-- Time Column Skeleton -->
                            <div class="battles-skeleton-cell" :style="{ width: columns[0].width }">
                                <div class="flex flex-col space-y-1">
                                    <div class="battles-skeleton-text" style="width: 60px;"></div> <!-- Battle ID -->
                                    <div class="battles-skeleton-text" style="width: 80px;"></div> <!-- Time ago -->
                                    <div class="battles-skeleton-text" style="width: 100px;"></div> <!-- Date, Year -->
                                    <div class="battles-skeleton-text" style="width: 90px;"></div> <!-- Time Range -->
                                    <div class="battles-skeleton-text" style="width: 70px;"></div> <!-- Duration -->
                                </div>
                            </div>
                            <!-- System Column Skeleton -->
                            <div class="battles-skeleton-cell" :style="{ width: columns[1].width }">
                                <div class="flex items-center gap-2">
                                    <div class="battles-skeleton-image"></div>
                                    <div class="flex flex-col space-y-1">
                                        <div class="battles-skeleton-title" style="width: 100px;"></div>
                                        <div class="battles-skeleton-subtitle" style="width: 70px;"></div>
                                    </div>
                                </div>
                            </div>
                            <!-- Stats Column Skeleton -->
                            <div class="battles-skeleton-cell" :style="{ width: columns[2].width }">
                                <div class="flex flex-col space-y-1">
                                    <div class="battles-skeleton-text" style="width: 120px;"></div> <!-- ISK / KMs -->
                                    <div class="battles-skeleton-text" style="width: 100px;"></div>
                                    <!-- Alliances / Corps -->
                                    <div class="battles-skeleton-text" style="width: 80px;"></div> <!-- Characters -->
                                </div>
                            </div>
                            <!-- Involved Column Skeleton -->
                            <div class="battles-skeleton-cell" :style="{ width: columns[3].width }">
                                <div class="flex flex-col space-y-1 w-full">
                                    <div class="flex flex-wrap gap-1">
                                        <div v-for="s_img in 5" :key="`s_img_ent_${s_img}`"
                                            class="battles-skeleton-image" style="width:24px; height:24px;"></div>
                                    </div>
                                    <div class="flex flex-wrap gap-1">
                                        <div v-for="s_img_ship in 5" :key="`s_img_ship_${s_img_ship}`"
                                            class="battles-skeleton-image" style="width:24px; height:24px;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </Table>
            <!-- Bottom Pagination -->
            <div class="flex justify-end mt-4">
                <UPagination v-model:page="currentPage" :total="totalItems" :items-per-page="selectedPageSize"
                    :disabled="pending" size="sm" />
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: .5;
    }
}

.battles-skeleton-container {
    width: 100%;
}

.battles-skeleton-row {
    display: flex;
    width: 100%;
    min-height: 60px;
    /* Adjusted slightly from killlist for potential content difference */
    padding: 8px 12px;
    margin-bottom: 4px;
    border-radius: 6px;
    background-color: light-dark(rgba(255, 255, 255, 0.4), rgba(26, 26, 26, 0.3));
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

.battles-skeleton-cell {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    flex-grow: 0;
    padding: 0 4px;
    /* Added padding for cell spacing */
}

.battles-skeleton-image {
    width: 32px;
    /* Slightly smaller than killlist */
    height: 32px;
    flex-shrink: 0;
    margin-right: 8px;
    /* Added margin */
    border-radius: 6px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.battles-skeleton-title {
    height: 14px;
    /* Adjusted */
    width: 80px;
    /* Adjusted */
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
    margin-bottom: 4px;
    /* Added margin */
}

.battles-skeleton-subtitle {
    height: 10px;
    /* Adjusted */
    width: 60px;
    /* Adjusted */
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.battles-skeleton-text {
    height: 14px;
    /* Standard text height */
    border-radius: 4px;
    background-color: light-dark(#e5e7eb, #374151);
    animation: pulse 1.5s ease-in-out infinite;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
