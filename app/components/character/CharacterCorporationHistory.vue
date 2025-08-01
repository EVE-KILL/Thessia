<template>
    <div>
        <div v-if="pending" class="flex justify-center items-center py-8">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" size="lg" />
            <span class="ml-2 text-gray-400">{{ $t('loading') }}</span>
        </div>
        <div v-else-if="history.length > 0"
            class="overflow-x-auto rounded-lg shadow-lg bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <table class="table-auto min-w-full">
                <thead>
                    <tr class="bg-gray-800 text-white uppercase text-xs leading-normal">
                        <th class="px-4 py-2 text-left">{{ $t('corporation') }}</th>
                        <th class="px-4 py-2 text-left">{{ $t('joinDate') }}</th>
                        <th class="px-4 py-2 text-left">{{ $t('leaveDate') }}</th>
                    </tr>
                </thead>
                <tbody class="text-gray-300 text-sm">
                    <tr v-for="entry in history" :key="entry.record_id"
                        class="border-b border-gray-700 hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
                        @click="goToCorporation(entry.corporation_id)">
                        <td class="px-4 py-2">
                            {{ entry.corporation_name }}
                            <span v-if="entry.alliance_id">
                                &nbsp;(
                                <NuxtLink :to="`/alliance/${entry.alliance_id}`"
                                    class="text-primary-400 hover:underline" @click.stop>
                                    {{ entry.alliance_name }}
                                </NuxtLink>
                                )
                            </span>
                        </td>
                        <td class="px-4 py-2">{{ formatDate(entry.start_date) }}</td>
                        <td class="px-4 py-2">
                            <span v-if="entry.end_date">{{ formatDate(entry.end_date) }}</span>
                            <span v-else class="italic text-gray-500">{{ $t('present') }}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div v-else class="text-center text-gray-400 py-8">
            {{ $t('character.noCorporationHistory') }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const characterId = route.params.id;

interface ICorporationHistoryEntry {
    record_id: number;
    corporation_id: number;
    corporation_name: string;
    corporation_ticker?: string;
    alliance_id?: number;
    alliance_name?: string;
    start_date: string;
    end_date?: string | null;
}

const { data: historyRaw, pending } = useFetch<ICorporationHistoryEntry[] | { error: string }>(
    `/api/characters/${characterId}/corporationhistory`,
    { default: () => [] }
);

const history = computed(() => {
    if (Array.isArray(historyRaw.value)) {
        return historyRaw.value as ICorporationHistoryEntry[];
    }
    return [];
});

function goToCorporation(corporationId: number) {
    router.push(`/corporation/${corporationId}`);
}

function formatDate(dateString: string) {
    if (!dateString) return '';
    return format(new Date(dateString), 'yyyy-MM-dd');
}
</script>

<style scoped>
.table-auto th,
.table-auto td {
    white-space: nowrap;
}
</style>
