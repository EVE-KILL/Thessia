<template>
    <div>
        <div class="flex justify-between items-center mb-2">
            <h2 class="text-lg font-semibold">{{ t('battles') }}</h2>
        </div>
        <div v-if="pending" class="text-center py-4">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" size="lg" />
        </div>
        <div v-else>
            <table class="table-auto w-full text-left">
                <thead>
                    <tr class="bg-gray-800 text-white">
                        <th class="px-4 py-2">{{ t('time') }}</th>
                        <th class="px-4 py-2">{{ t('system') }}</th>
                        <th class="px-4 py-2">{{ t('region') }}</th>
                        <th class="px-4 py-2">{{ t('duration') }}</th>
                        <th class="px-4 py-2">{{ t('stats') }}</th>
                        <th class="px-4 py-2">{{ t('involved') }}</th>
                    </tr>
                </thead>
                <tbody class="text-gray-200">
                    <tr v-for="battle in battlesList" :key="battle.battle_id" @click="goToBattle(battle.battle_id)"
                        class="border-b border-gray-700 hover:bg-gray-700 cursor-pointer">
                        <td class="px-4 py-2">{{ formatTimeAgo(battle.start_time) }}</td>
                        <td class="px-4 py-2">{{ getLocalizedString(battle.system_name, locale) }}</td>
                        <td class="px-4 py-2">{{ getLocalizedString(battle.region_name, locale) }}</td>
                        <td class="px-4 py-2">{{ formatDuration(battle.duration_ms) }}</td>
                        <td class="px-4 py-2">{{ formatNumber(battle.killmailsCount) }} kills</td>
                        <td class="px-4 py-2">
                            {{ battle.alliancesInvolved.length + battle.corporationsInvolved.length }} orgs
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="flex justify-between items-center mt-4">
                <UButton :disabled="currentPage === 1" size="sm" @click="prevPage">{{ t('previous') }}</UButton>
                <span>{{ currentPage }} / {{ totalPages }}</span>
                <UButton :disabled="currentPage === totalPages" size="sm" @click="nextPage">{{ t('next') }}
                </UButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onDeactivated } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import type { IBattlesDocument } from '~/server/models/Battles';

const { t, locale: localeRef } = useI18n();
const locale = computed(() => localeRef.value);
const route = useRoute();
const router = useRouter();

const currentPage = ref(1);
const pageSize = ref(10);

// Ensure we properly reset state when entity changes
const entityId = computed(() => route.params.id);

// Reset page when entity changes
watch(entityId, (newId, oldId) => {
    if (newId !== oldId) {
        currentPage.value = 1;
    }
});

// Create a more specific cache key including route name and path
const cacheKey = computed(() =>
    `char-battles-${entityId.value}-p${currentPage.value}-${route.path}`
);

// Clear cache when component is unmounted or deactivated with KeepAlive
const clearComponentCache = () => {
    clearNuxtData(cacheKey.value);
};

onBeforeUnmount(clearComponentCache);
onDeactivated(clearComponentCache);

const { data, pending, refresh } = useFetch<{
    battles: IBattlesDocument[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
}>(
    `/api/characters/${entityId.value}/battles`,
    {
        query: {
            page: currentPage.value,
            limit: pageSize.value
        },
        key: cacheKey.value,
        server: false, // Fetch on client to avoid SSR cache issues
        immediate: true,
        watch: [entityId]
    }
);

const battlesList = computed(() => data.value?.battles || []);
const totalPages = computed(() => data.value?.totalPages || 1);

// Watch page changes and refresh
watch([currentPage], () => {
    refresh();
});

function prevPage() {
    if (currentPage.value > 1) currentPage.value--;
}
function nextPage() {
    if (currentPage.value < totalPages.value) currentPage.value++;
}

function formatTimeAgo(date: Date | string) {
    return new Date(date).toLocaleString();
}
function formatDuration(ms: number | undefined | null) {
    if (!ms) return '-';
    const sec = Math.floor(ms / 1000);
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
function formatNumber(n: number | undefined) {
    return n?.toLocaleString() || '0';
}
function getLocalizedString(obj: any, localeKey: string) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[localeKey] || obj.en || '';
}
function goToBattle(battleId: number) {
    router.push(`/battle/${battleId}`);
}
</script>

<style scoped>
.table-auto th,
.table-auto td {
    white-space: nowrap;
}
</style>
