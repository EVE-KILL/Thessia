<template>
    <div>
        <div v-if="wars.length === 0" class="p-6 text-center text-zinc-400">
            {{ t('wars.noWarsFound') }}
        </div>

        <!-- Desktop Table View -->
        <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full table-fixed">
                <colgroup>
                    <col style="width: 33.33%; max-width: 200px;">
                    <col style="width: 33.33%; max-width: 200px;">
                    <col style="width: 33.34%; max-width: 180px;">
                </colgroup>
                <thead>
                    <tr class="border-b border-zinc-700/50">
                        <th class="px-3 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                            {{ t('wars.table.aggressor') }}
                        </th>
                        <th class="px-3 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                            {{ t('wars.table.defender') }}
                        </th>
                        <th class="px-3 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                            {{ showFinishedDate ? t('wars.table.finished') : t('wars.table.declared') }}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800/30">
                    <tr v-for="war in wars" :key="war.war_id"
                        class="hover:bg-zinc-800/30 cursor-pointer transition-colors duration-150"
                        @click="navigateTo(`/war/${war.war_id}`)">
                        <td class="px-3 py-3"
                            style="max-width: 200px; word-wrap: break-word; overflow-wrap: break-word;">
                            <div class="flex items-center space-x-2">
                                <Image v-if="war.aggressor.alliance" :type="'alliance'" :id="war.aggressor.alliance_id"
                                    :size="24" :alt="war.aggressor.alliance.name"
                                    class="w-5 h-5 rounded flex-shrink-0" />
                                <Image v-else-if="war.aggressor.corporation" :type="'corporation'"
                                    :id="war.aggressor.corporation_id" :size="24" :alt="war.aggressor.corporation.name"
                                    class="w-5 h-5 rounded flex-shrink-0" />
                                <span v-if="war.aggressor.alliance"
                                    class="font-medium text-zinc-100 text-sm block truncate" style="max-width: 160px;"
                                    :title="war.aggressor.alliance.name">
                                    {{ war.aggressor.alliance.name }}
                                </span>
                                <span v-else-if="war.aggressor.corporation"
                                    class="font-medium text-zinc-100 text-sm block truncate" style="max-width: 160px;"
                                    :title="war.aggressor.corporation.name">
                                    {{ war.aggressor.corporation.name }}
                                </span>
                            </div>
                        </td>
                        <td class="px-3 py-3"
                            style="max-width: 200px; word-wrap: break-word; overflow-wrap: break-word;">
                            <div class="flex items-center space-x-2">
                                <Image v-if="war.defender.alliance" :type="'alliance'" :id="war.defender.alliance_id"
                                    :size="24" :alt="war.defender.alliance.name"
                                    class="w-5 h-5 rounded flex-shrink-0" />
                                <Image v-else-if="war.defender.corporation" :type="'corporation'"
                                    :id="war.defender.corporation_id" :size="24" :alt="war.defender.corporation.name"
                                    class="w-5 h-5 rounded flex-shrink-0" />
                                <span v-if="war.defender.alliance"
                                    class="font-medium text-zinc-100 text-sm block truncate" style="max-width: 160px;"
                                    :title="war.defender.alliance.name">
                                    {{ war.defender.alliance.name }}
                                </span>
                                <span v-else-if="war.defender.corporation"
                                    class="font-medium text-zinc-100 text-sm block truncate" style="max-width: 160px;"
                                    :title="war.defender.corporation.name">
                                    {{ war.defender.corporation.name }}
                                </span>
                            </div>
                        </td>
                        <td class="px-3 py-3 whitespace-nowrap">
                            <div class="text-sm text-zinc-100">
                                {{ formatDateDisplay(showFinishedDate ? war.finished : war.declared) }}
                            </div>
                            <div class="text-xs text-zinc-400">
                                {{ formatTimeAgo(showFinishedDate ? war.finished : war.declared) }}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Mobile Card View -->
        <div class="md:hidden space-y-3">
            <div v-for="war in wars" :key="war.war_id" class="recent-war-mobile-card"
                @click="navigateTo(`/war/${war.war_id}`)">
                <!-- War Header -->
                <div class="recent-war-header">
                    <div class="recent-war-id">
                        <Icon name="lucide:sword" class="recent-war-icon" />
                        <span class="recent-war-label">{{ t('wars.war') }} #{{ war.war_id }}</span>
                    </div>
                    <div class="recent-war-date">
                        <div class="recent-war-date-primary">{{ formatDateDisplay(showFinishedDate ? war.finished :
                            war.declared) }}</div>
                        <div class="recent-war-date-secondary">{{ formatTimeAgo(showFinishedDate ? war.finished :
                            war.declared) }}</div>
                    </div>
                </div>

                <!-- VS Section - Compact Version -->
                <div class="recent-war-vs-section">
                    <!-- Aggressor Side -->
                    <div class="recent-war-entity aggressor">
                        <div class="recent-entity-content">
                            <div class="recent-entity-image">
                                <Image v-if="war.aggressor.alliance" :type="'alliance'" :id="war.aggressor.alliance_id"
                                    :size="32" :alt="war.aggressor.alliance.name" class="w-8 h-8 rounded" />
                                <Image v-else-if="war.aggressor.corporation" :type="'corporation'"
                                    :id="war.aggressor.corporation_id" :size="32" :alt="war.aggressor.corporation.name"
                                    class="w-8 h-8 rounded" />
                            </div>
                            <div class="recent-entity-info">
                                <div class="recent-entity-role">{{ t('wars.table.aggressor') }}</div>
                                <div v-if="war.aggressor.alliance" class="recent-entity-name">
                                    {{ war.aggressor.alliance.name }}
                                </div>
                                <div v-else-if="war.aggressor.corporation" class="recent-entity-name">
                                    {{ war.aggressor.corporation.name }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- VS Divider - Smaller -->
                    <div class="recent-war-vs-divider">
                        <div class="recent-vs-circle">
                            <span class="recent-vs-text">VS</span>
                        </div>
                    </div>

                    <!-- Defender Side -->
                    <div class="recent-war-entity defender">
                        <div class="recent-entity-content">
                            <div class="recent-entity-info">
                                <div class="recent-entity-role">{{ t('wars.table.defender') }}</div>
                                <div v-if="war.defender.alliance" class="recent-entity-name">
                                    {{ war.defender.alliance.name }}
                                </div>
                                <div v-else-if="war.defender.corporation" class="recent-entity-name">
                                    {{ war.defender.corporation.name }}
                                </div>
                            </div>
                            <div class="recent-entity-image">
                                <Image v-if="war.defender.alliance" :type="'alliance'" :id="war.defender.alliance_id"
                                    :size="32" :alt="war.defender.alliance.name" class="w-8 h-8 rounded" />
                                <Image v-else-if="war.defender.corporation" :type="'corporation'"
                                    :id="war.defender.corporation_id" :size="32" :alt="war.defender.corporation.name"
                                    class="w-8 h-8 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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

<style scoped>
/* Mobile Recent War Card Styling - Compact Version */
.recent-war-mobile-card {
    background: linear-gradient(135deg, rgba(31, 31, 31, 0.6), rgba(45, 45, 45, 0.4));
    border: 1px solid rgba(75, 85, 99, 0.2);
    border-radius: 0.5rem;
    padding: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.recent-war-mobile-card:hover {
    border-color: rgba(59, 130, 246, 0.4);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
    transform: translateY(-1px);
}

/* War Header - Compact */
.recent-war-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.375rem;
    border-bottom: 1px solid rgba(75, 85, 99, 0.2);
}

.recent-war-id {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.recent-war-icon {
    width: 14px;
    height: 14px;
    color: #ef4444;
}

.recent-war-label {
    font-weight: 600;
    color: #e5e7eb;
    font-size: 0.8rem;
}

.recent-war-date {
    text-align: right;
}

.recent-war-date-primary {
    font-size: 0.75rem;
    color: #d1d5db;
    font-weight: 500;
}

.recent-war-date-secondary {
    font-size: 0.65rem;
    color: #9ca3af;
    margin-top: 0.125rem;
}

/* VS Section - Compact */
.recent-war-vs-section {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0.5rem;
    align-items: center;
}

.recent-war-entity {
    display: flex;
    flex-direction: column;
}

.recent-entity-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.aggressor .recent-entity-content {
    flex-direction: row;
}

.defender .recent-entity-content {
    flex-direction: row-reverse;
}

.recent-entity-image {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(31, 31, 31, 0.3);
    border-radius: 0.375rem;
    border: 1px solid rgba(75, 85, 99, 0.2);
}

.recent-entity-info {
    flex: 1;
    min-width: 0;
}

.aggressor .recent-entity-info {
    text-align: left;
}

.defender .recent-entity-info {
    text-align: right;
}

.recent-entity-role {
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    margin-bottom: 0.125rem;
}

.aggressor .recent-entity-role {
    color: #ef4444;
}

.defender .recent-entity-role {
    color: #3b82f6;
}

.recent-entity-name {
    font-weight: 600;
    font-size: 0.75rem;
    color: #e5e7eb;
    line-height: 1.2;
    word-break: break-word;
}

/* VS Divider - Compact */
.recent-war-vs-divider {
    display: flex;
    justify-content: center;
    align-items: center;
}

.recent-vs-circle {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(239, 68, 68, 0.2);
    box-shadow: 0 0 6px rgba(239, 68, 68, 0.2);
}

.recent-vs-text {
    font-size: 0.65rem;
    font-weight: 800;
    color: white;
    letter-spacing: 0.1em;
}

/* Responsive adjustments for very small screens */
@media (max-width: 380px) {
    .recent-war-mobile-card {
        padding: 0.5rem;
    }

    .recent-war-vs-section {
        gap: 0.375rem;
    }

    .recent-entity-content {
        gap: 0.375rem;
    }

    .recent-entity-image {
        width: 32px;
        height: 32px;
    }

    .recent-vs-circle {
        width: 24px;
        height: 24px;
    }

    .recent-vs-text {
        font-size: 0.6rem;
    }

    .recent-entity-name {
        font-size: 0.7rem;
    }
}
</style>
