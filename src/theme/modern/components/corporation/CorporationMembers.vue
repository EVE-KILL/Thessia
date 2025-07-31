<template>
    <div>
        <div v-if="pending" class="flex justify-center items-center py-8">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" size="lg" />
            <span class="ml-2 text-gray-400">{{ $t('loading') }}</span>
        </div>
        <div v-else-if="members.length > 0">
            <div class="flex justify-between items-center mb-2">
                <div class="text-xs text-gray-400">
                    {{ total }} {{ $t('character') }}<span v-if="pageCount > 1"> ({{ $t('common.page') }} {{ page }} /
                        {{ pageCount }})</span>
                </div>
                <div class="flex-1 flex justify-end">
                    <UPagination v-if="total > limit" v-model:page="page" :total="total" :items-per-page="limit"
                        :ui="{ wrapper: 'flex items-center' }" />
                </div>
            </div>
            <!-- Tabs for Grid/Table views -->
            <Tabs v-model="activeTabId" :items="viewTabs" class="mb-4">
                <!-- Grid View (Default) -->
                <template #grid>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div v-for="member in members" :key="member.character_id"
                            class="flex flex-col items-center character-card"
                            @click="goToCharacter(member.character_id)">
                            <div class="relative portrait-container">
                                <Image type="character" :id="member.character_id" :alt="member.name"
                                    class="rounded-full w-16 h-16 sm:w-20 sm:h-20 portrait-image" size="128" />
                            </div>
                            <div class="mt-2 text-center text-sm text-gray-300 truncate w-full">{{ member.name }}</div>
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
                                    <th class="px-4 py-2 text-left">{{ $t('character') }}</th>
                                </tr>
                            </thead>
                            <tbody class="text-gray-300 text-sm">
                                <tr v-for="member in members" :key="member.character_id"
                                    class="border-b border-gray-700 hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
                                    @click="goToCharacter(member.character_id)">
                                    <td class="px-4 py-2">{{ member.name }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </template>
            </Tabs>
            <div class="flex justify-end mt-6">
                <UPagination v-if="total > limit" v-model:page="page" :total="total" :items-per-page="limit"
                    :ui="{ wrapper: 'flex justify-center' }" />
            </div>
        </div>
        <div v-else class="text-center text-gray-400 py-8">
            {{ $t('corporation.noMembers') }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import Tabs from '~/src/theme/modern/components/common/Tabs.vue';

interface IMember {
    character_id: number;
    name: string;
}

const { t } = useI18n();
const props = defineProps<{
    corporation: { corporation_id: number }
}>()

const route = useRoute()
const router = useRouter()
const members = ref<IMember[]>([])
const pending = ref(true)
const page = ref(1)
const limit = 1000
const total = ref(0)
const pageCount = ref(1)

const activeTabId = ref('grid');

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

async function fetchMembers() {
    pending.value = true;
    try {
        const res = await fetch(`/api/corporations/${props.corporation.corporation_id}/members?page=${page.value}&limit=${limit}`);
        const data = await res.json();
        members.value = data.members || [];
        total.value = data.total || 0;
        pageCount.value = data.pageCount || 1;
    } catch (err) {
        console.log('Error fetching members:', err);
        members.value = [];
        total.value = 0;
        pageCount.value = 1;
    }
    pending.value = false;
}

onMounted(() => {
    fetchMembers();
});

watch(page, async () => {
    await fetchMembers();
});

function goToCharacter(characterId: number) {
    router.push(`/character/${characterId}`)
}
</script>

<style scoped>
.character-card {
    cursor: pointer;
    transition: transform 0.2s ease;
}

.character-card:hover {
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

.character-card:hover .portrait-image {
    transform: scale(1.1);
}
</style>
