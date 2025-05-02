<template>
    <div>
        <div v-if="pending" class="flex justify-center items-center py-8">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" size="lg" />
            <span class="ml-2 text-gray-400">{{ $t('loading') }}</span>
        </div>
        <div v-else-if="corporations.length > 0">
            <div class="flex justify-between items-center mb-2">
                <div class="text-xs text-gray-400">
                    {{ total }} {{ $t('corporation') }}<span v-if="pageCount > 1"> ({{ $t('common.page') }} {{ page }} /
                        {{ pageCount }})</span>
                </div>
                <div class="flex-1 flex justify-end">
                    <UPagination v-if="total > limit" v-model:page="page" :total="total" :items-per-page="limit"
                        :ui="{ wrapper: 'flex items-center' }" />
                </div>
            </div>
            <!-- Tabs for Grid/Table views -->
            <UTabs :items="viewTabs" class="mb-4">
                <!-- Grid View (Default) -->
                <template #grid>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div v-for="corporation in corporations" :key="corporation.corporation_id"
                            class="flex flex-col items-center corporation-card"
                            @click="goToCorporation(corporation.corporation_id)">
                            <div class="relative portrait-container">
                                <Image type="corporation" :id="corporation.corporation_id" :alt="corporation.name"
                                    class="rounded-full w-16 h-16 sm:w-20 sm:h-20 portrait-image" format="webp"
                                    size="128" />
                            </div>
                            <div class="mt-2 text-center text-sm text-gray-300 truncate w-full">{{ corporation.name }}
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Table View -->
                <template #table>
                    <div
                        class="overflow-x-auto rounded-lg shadow-lg bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
                        <table class="table-auto min-w-full">
                            <thead>
                                <tr class="bg-gray-800 text-white uppercase text-xs leading-normal">
                                    <th class="px-4 py-2 text-left">{{ $t('corporation') }}</th>
                                </tr>
                            </thead>
                            <tbody class="text-gray-300 text-sm">
                                <tr v-for="corporation in corporations" :key="corporation.corporation_id"
                                    class="border-b border-gray-700 hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
                                    @click="goToCorporation(corporation.corporation_id)">
                                    <td class="px-4 py-2">{{ corporation.name }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </template>
            </UTabs>
            <div class="flex justify-end mt-6">
                <UPagination v-if="total > limit" v-model:page="page" :total="total" :items-per-page="limit"
                    :ui="{ wrapper: 'flex justify-center' }" />
            </div>
        </div>
        <div v-else class="text-center text-gray-400 py-8">
            {{ $t('alliance.noCorporations') }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

interface ICorporation {
    corporation_id: number;
    name: string;
}

const { t } = useI18n();
const props = defineProps<{
    alliance: { alliance_id: number }
}>()

const route = useRoute()
const router = useRouter()
const corporations = ref<ICorporation[]>([])
const pending = ref(true)
const page = ref(1)
const limit = 1000
const total = ref(0)
const pageCount = ref(1)

// Define view tabs
const viewTabs = [
    {
        id: 'grid',
        label: t('grid'),
        icon: 'i-lucide-grid',
        slot: 'grid'
    },
    {
        id: 'table',
        label: t('table'),
        icon: 'i-lucide-list',
        slot: 'table'
    }
]

watch(page, async (newPage) => {
    await fetchCorporations();
});

async function fetchCorporations() {
    pending.value = true;
    try {
        const res = await fetch(`/api/alliances/${props.alliance.alliance_id}/corporations?page=${page.value}&limit=${limit}`);
        const data = await res.json();
        corporations.value = data.corporations || [];
        total.value = data.total || 0;
        pageCount.value = data.pageCount || 1;
    } catch (err) {
        console.log('Error fetching corporations:', err);
        corporations.value = [];
        total.value = 0;
        pageCount.value = 1;
    }
    pending.value = false;
}

function goToCorporation(corporationId: number) {
    router.push(`/corporation/${corporationId}`)
}

onMounted(() => {
    fetchCorporations();
});
</script>

<style scoped>
.corporation-card {
    cursor: pointer;
    transition: transform 0.2s ease;
}

.corporation-card:hover {
    transform: scale(1.05);
}

.portrait-container {
    overflow: hidden;
    border-radius: 50%;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.portrait-image {
    transition: transform 0.3s ease;
}

.corporation-card:hover .portrait-image {
    transform: scale(1.1);
}
</style>
