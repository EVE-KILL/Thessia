<template>
    <div class="overflow-x-auto">
        <div v-if="wars.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-400">
            {{ t('wars.noWarsFound') }}
        </div>
        <table v-else class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
            <colgroup>
                <col style="width: 33.33%; max-width: 200px;">
                <col style="width: 33.33%; max-width: 200px;">
                <col style="width: 33.34%; max-width: 180px;">
            </colgroup>
            <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                    <th
                        class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {{ t('wars.table.aggressor') }}
                    </th>
                    <th
                        class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {{ t('wars.table.defender') }}
                    </th>
                    <th
                        class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {{ showFinishedDate ? t('wars.table.finished') : t('wars.table.declared') }}
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="war in wars" :key="war.war_id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td class="px-3 py-2" style="max-width: 200px; word-wrap: break-word; overflow-wrap: break-word;">
                        <div class="flex items-center space-x-2">
                            <Image v-if="war.aggressor.alliance" :type="'alliance'" :id="war.aggressor.alliance_id"
                                :size="24" :alt="war.aggressor.alliance.name" class="w-5 h-5 rounded flex-shrink-0" />
                            <Image v-else-if="war.aggressor.corporation" :type="'corporation'"
                                :id="war.aggressor.corporation_id" :size="24" :alt="war.aggressor.corporation.name"
                                class="w-5 h-5 rounded flex-shrink-0" />
                            <span v-if="war.aggressor.alliance"
                                class="font-medium text-gray-900 dark:text-white text-sm block truncate"
                                style="max-width: 160px;" :title="war.aggressor.alliance.name">
                                {{ war.aggressor.alliance.name }}
                            </span>
                            <span v-else-if="war.aggressor.corporation"
                                class="font-medium text-gray-900 dark:text-white text-sm block truncate"
                                style="max-width: 160px;" :title="war.aggressor.corporation.name">
                                {{ war.aggressor.corporation.name }}
                            </span>
                        </div>
                    </td>
                    <td class="px-3 py-2" style="max-width: 200px; word-wrap: break-word; overflow-wrap: break-word;">
                        <div class="flex items-center space-x-2">
                            <Image v-if="war.defender.alliance" :type="'alliance'" :id="war.defender.alliance_id"
                                :size="24" :alt="war.defender.alliance.name" class="w-5 h-5 rounded flex-shrink-0" />
                            <Image v-else-if="war.defender.corporation" :type="'corporation'"
                                :id="war.defender.corporation_id" :size="24" :alt="war.defender.corporation.name"
                                class="w-5 h-5 rounded flex-shrink-0" />
                            <span v-if="war.defender.alliance"
                                class="font-medium text-gray-900 dark:text-white text-sm block truncate"
                                style="max-width: 160px;" :title="war.defender.alliance.name">
                                {{ war.defender.alliance.name }}
                            </span>
                            <span v-else-if="war.defender.corporation"
                                class="font-medium text-gray-900 dark:text-white text-sm block truncate"
                                style="max-width: 160px;" :title="war.defender.corporation.name">
                                {{ war.defender.corporation.name }}
                            </span>
                        </div>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap">
                        <div class="text-sm text-gray-900 dark:text-white">
                            {{ formatDateDisplay(showFinishedDate ? war.finished : war.declared) }}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            {{ formatTimeAgo(showFinishedDate ? war.finished : war.declared) }}
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
interface Props {
    wars: any[];
    showFinishedDate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    showFinishedDate: false
});

const { t } = useI18n();

// Use the centralized date formatting composable
const {
    formatTimeAgo,
    formatDateDisplay,
} = useDateFormatting();
</script>
