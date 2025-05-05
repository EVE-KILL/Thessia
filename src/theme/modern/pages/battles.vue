<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import moment from 'moment';
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
    { id: 'battle_id', header: computed(() => t('battleId', 'ID')), width: '10%' },
    { id: 'start_time', header: computed(() => t('startTime', 'Start Time')), width: '20%' },
    { id: 'system', header: computed(() => t('system', 'System')), width: '20%' },
    { id: 'involved', header: computed(() => t('involved', 'Involved')), width: '20%', headerClass: 'text-center', cellClass: 'text-center' },
    { id: 'killmailsCount', header: computed(() => t('killmails', 'Kills')), width: '10%', headerClass: 'text-right', cellClass: 'text-right' },
    { id: 'iskDestroyed', header: computed(() => t('iskDestroyed', 'ISK Lost')), width: '20%', headerClass: 'text-right', cellClass: 'text-right' },
];

const battlesList = computed(() => data.value?.battles || []);
const totalItems = computed(() => data.value?.totalItems || 0);

const formatDate = (date: string | Date): string => {
    moment.locale(currentLocale.value);
    return moment.utc(date).format('YYYY-MM-DD HH:mm');
};

const formatInvolved = (battle: IBattlesDocument): { alliances: number; corps: number; chars: number } => {
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
const goToSystem = (systemId: number) => router.push(`/system/${systemId}`);

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
watch([currentPage, selectedPageSize], () => refresh());

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
                <template #cell-battle_id="{ item }">
                    <NuxtLink :to="linkFn(item)" class="text-primary-500 hover:underline font-semibold">
                        #{{ item.battle_id }}
                    </NuxtLink>
                </template>
                <template #cell-start_time="{ item }">
                    <UTooltip :text="moment.utc(item.start_time).format('YYYY-MM-DD HH:mm:ss UTC')">
                        <span class="text-sm">{{ formatDate(item.start_time) }}</span>
                    </UTooltip>
                </template>
                <template #cell-system="{ item }">
                    <div class="flex items-center gap-2 cursor-pointer" @click.stop="goToSystem(item.system_id)">
                        <Image :id="item.system_id" type="system" size="32" format="webp"
                            class="w-8 h-8 rounded flex-shrink-0" />
                        <div class="text-sm">
                            <div class="hover:underline">{{ item.system_name }}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">{{ item.region_name }} [{{
                                item.system_security?.toFixed(1) ?? 'N/A' }}]</div>
                        </div>
                    </div>
                </template>
                <template #cell-involved="{ item }">
                    <UTooltip position="left">
                        <div class="flex w-full items-center justify-center gap-3 text-sm">
                            <div class="flex items-center gap-1">
                                <UIcon name="i-heroicons-user-group" class="text-blue-400" />
                                <span>{{ formatInvolved(item).alliances }}</span>
                            </div>
                            <div class="flex items-center gap-1">
                                <UIcon name="i-heroicons-briefcase" class="text-green-400" />
                                <span>{{ formatInvolved(item).corps }}</span>
                            </div>
                        </div>
                        <template #text>
                            <div class="text-xs space-y-1">
                                <div>{{ formatInvolved(item).alliances }} Alliances</div>
                                <div>{{ formatInvolved(item).corps }} Corporations</div>
                            </div>
                        </template>
                    </UTooltip>
                </template>
                <template #cell-killmailsCount="{ item }">
                    <div class="w-full flex justify-end">
                        <span class="text-sm">{{ formatNumber(item.killmailsCount) }}</span>
                    </div>
                </template>
                <template #cell-iskDestroyed="{ item }">
                    <div class="w-full flex justify-end">
                        <span class="text-sm font-semibold">{{ formatIsk(item.iskDestroyed) }}</span>
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
                            <!-- ID column -->
                            <div class="battles-skeleton-cell" :style="{ width: columns[0].width }">
                                <div class="battles-skeleton-text" style="width: 50px;"></div>
                            </div>
                            <!-- Start Time column -->
                            <div class="battles-skeleton-cell" :style="{ width: columns[1].width }">
                                <div class="battles-skeleton-text" style="width: 100px;"></div>
                            </div>
                            <!-- System column -->
                            <div class="battles-skeleton-cell" :style="{ width: columns[2].width }">
                                <div class="flex items-center gap-2">
                                    <div class="battles-skeleton-image"></div>
                                    <div class="flex flex-col">
                                        <div class="battles-skeleton-title"></div>
                                        <div class="battles-skeleton-subtitle"></div>
                                    </div>
                                </div>
                            </div>
                            <!-- Involved column -->
                            <div class="battles-skeleton-cell justify-center" :style="{ width: columns[3].width }">
                                <div class="flex items-center gap-3">
                                    <div class="battles-skeleton-text" style="width: 24px;"></div>
                                    <div class="battles-skeleton-text" style="width: 24px;"></div>
                                </div>
                            </div>
                            <!-- KMs column -->
                            <div class="battles-skeleton-cell justify-end" :style="{ width: columns[4].width }">
                                <div class="battles-skeleton-text" style="width: 30px;"></div>
                                <div class="flex justify-end mt-4">
                                    <UPagination v-model:page="currentPage" :total="totalItems"
                                        :items-per-page="selectedPageSize" :disabled="pending" size="sm" />
                                </div>
                            </div>
                            <!-- ISK Lost column -->
                            <div class="battles-skeleton-cell justify-end" :style="{ width: columns[5].width }">
                                <div class="battles-skeleton-text" style="width: 80px;"></div>
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
