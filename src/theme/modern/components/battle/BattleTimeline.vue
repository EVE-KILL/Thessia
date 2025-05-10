<template>
    <div class="mt-4">
        <Table :columns="timelineColumns" :items="sortedKillmails" :link-fn="generateKillmailLink" :bordered="true"
            :striped="false" :hover="true" density="normal" background="transparent" table-class="battle-timeline-table"
            header-class="battle-timeline-header">
            <template #header-blue-losses>
                <div class="text-right text-black dark:text-white">Blue Team Losses</div>
            </template>
            <template #header-vs>
                <div class="text-center text-black dark:text-white">VS</div>
            </template>
            <template #header-red-losses>
                <div class="text-left text-black dark:text-white">Red Team Losses</div>
            </template>

            <template #cell-blue-losses="{ item }">
                <template v-if="isBlueTeamKill(item)">
                    <div class="flex justify-end items-center w-full">
                        <div>
                            <div class="font-bold text-black dark:text-white">{{
                                truncateString(getLocalizedString(item.victim.ship_name, locale),
                                    20) }}</div>
                            <div class="text-xs text-background-400">{{
                                getLocalizedString(item.victim.ship_group_name, locale) }}</div>
                        </div>
                        <div class="mx-4">
                            <div class="font-bold text-black dark:text-white">{{ item.victim.character_name }}</div>
                            <div class="text-xs text-background-400">{{ formatNumber(item.victim.damage_taken) }}
                                damage</div>
                        </div>
                        <div class="flex flex-col items-end">
                            <div class="flex flex-row items-center">
                                <div class="text-xs mr-4 text-black dark:text-white">{{ formatDate(item.kill_time) }}
                                </div>
                                <Image :type="'item'" :id="item.victim.ship_id"
                                    :alt="getLocalizedString(item.victim.ship_name, locale) || item.victim.ship_type"
                                    :size="48" class="h-12 w-12" />
                            </div>
                        </div>
                    </div>
                </template>
                <template v-else>
                    <!-- Empty cell for red team kills -->
                </template>
            </template>

            <template #cell-vs="{ item }">
                <div class="text-center h-full w-px bg-background-600"></div>
            </template>

            <template #cell-red-losses="{ item }">
                <template v-if="!isBlueTeamKill(item)">
                    <div class="flex justify-start items-center">
                        <div class="flex flex-col items-start mr-4">
                            <div class="flex flex-row items-center">
                                <Image :type="'item'" :id="item.victim.ship_id"
                                    :alt="getLocalizedString(item.victim.ship_name, locale) || item.victim.ship_type"
                                    :size="48" class="h-12 w-12" />
                                <div class="text-xs ml-4 text-black dark:text-white">{{ formatDate(item.kill_time) }}
                                </div>
                            </div>
                        </div>
                        <div class="text-center mx-4">
                            <div class="font-bold text-black dark:text-white">{{ item.victim.character_name }}</div>
                            <div class="text-xs text-background-400">{{ formatNumber(item.victim.damage_taken) }}
                                damage</div>
                        </div>
                        <div class="text-center mx-4">
                            <div class="font-bold text-black dark:text-white">{{
                                truncateString(getLocalizedString(item.victim.ship_name, locale),
                                    20) }}</div>
                            <div class="text-xs text-background-400">{{
                                getLocalizedString(item.victim.ship_group_name, locale) }}</div>
                        </div>
                    </div>
                </template>
                <template v-else>
                    <!-- Empty cell for blue team kills -->
                </template>
            </template>
        </Table>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';

interface KillmailVictim {
    ship_id: number | string;
    ship_name: any;
    ship_type: string;
    ship_group_name: any;
    character_name: string;
    damage_taken: number;
    alliance_id?: number;
    corporation_id?: number;
}

interface KillmailItem {
    victim: KillmailVictim;
    kill_time: string | number;
    killmail_id: number | string;
}

const props = defineProps<{
    killmails: KillmailItem[],
    battle: any
}>();

const { locale } = useI18n();

const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    return obj[localeKey] || obj.en || "";
};

function formatDate(time: string | number) {
    // Accepts unix timestamp or string
    if (typeof time === 'number') return new Date(time * 1000).toLocaleString();
    return new Date(time).toLocaleString();
}

function formatNumber(n: number) {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function truncateString(str: any, num: number) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.length <= num ? str : str.slice(0, num) + '...';
}

function isBlueTeamKill(kill: KillmailItem) {
    if (!props.battle) return false;
    const blueAlliances = (props.battle.blue_team?.alliances || []).map((a: any) => a.id);
    const blueCorporations = (props.battle.blue_team?.corporations || []).map((c: any) => c.id);
    return (
        blueAlliances.includes(kill.victim.alliance_id) ||
        blueCorporations.includes(kill.victim.corporation_id)
    );
}

const sortedKillmails = computed(() => {
    if (!Array.isArray(props.killmails)) return [];
    // Accept both unix timestamp and string
    return [...props.killmails].sort((a: KillmailItem, b: KillmailItem) => {
        const aTime = typeof a.kill_time === 'number' ? a.kill_time : new Date(a.kill_time).getTime();
        const bTime = typeof b.kill_time === 'number' ? b.kill_time : new Date(b.kill_time).getTime();
        return aTime - bTime;
    });
});

const timelineColumns = [
    { id: 'blue-losses', header: 'Blue Team Losses', width: '45%', headerClass: 'text-right' },
    { id: 'vs', header: 'VS', width: '10%', headerClass: 'text-center' },
    { id: 'red-losses', header: 'Red Team Losses', width: '45%', headerClass: 'text-left' },
];

const generateKillmailLink = (item: KillmailItem): string => {
    return `/kill/${item.killmail_id}`;
};
</script>

<style scoped>
/* Add any necessary scoped styles here to match the original table appearance */
.battle-timeline-table :deep(.table-header) {
    background-color: rgba(26, 26, 26, 0.5);
    /* Example from TopBox */
    color: #9ca3af;
    /* Example from TopBox */
    text-transform: uppercase;
    font-size: 0.75rem;
    padding: 0.5rem 0;
    /* Adjust padding */
}

.battle-timeline-table :deep(.header-cell) {
    padding: 0 0.5rem;
    /* Adjust padding */
}

.battle-timeline-table :deep(.table-row) {
    border-bottom: 1px solid #282828;
    /* Example from original table */
    transition: background-color 0.3s ease;
    cursor: pointer;
}


.battle-timeline-table :deep(.body-cell) {
    padding: 0.5rem;
    /* Adjust padding */
}

.battle-timeline-table :deep(.body-cell.vs) {
    padding: 0;
    /* Remove padding for the VS column */
}

.battle-timeline-table :deep(.body-cell.vs > div) {
    width: 1px;
    /* Make the VS column a thin line */
    height: 100%;
    background-color: #282828;
    /* Match border color */
    margin: 0 auto;
    /* Center the line */
}

.battle-timeline-table :deep(tbody tr):hover {
    background: light-dark(rgba(229, 231, 235, 0.15), rgba(35, 35, 35, 0.5));
}
</style>
