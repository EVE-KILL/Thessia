<template>
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Blue Team Losses -->
        <div>
            <div class="mb-2 text-lg font-bold">Blue Team Losses</div>
            <Table :columns="killColumns" :items="blueTeamKills" :bordered="true" :striped="false" :hover="true"
                density="normal" background="transparent" table-class="kill-table" :link-fn="generateKillmailLink">
                <template #cell-ship="{ item, column, index }: { item: BattleKill, column: any, index: number }">
                    <div class="flex items-center">
                        <img :src="`https://images.eve-kill.com/types/${item.victim.ship_id}/render?size=64`"
                            :alt="`Ship: ${getLocalizedString(item.victim.ship_name, locale)}`"
                            class="w-10 rounded mr-2" />
                        <div>
                            {{ truncateString(getLocalizedString(item.victim.ship_name, locale), 20) }}<br />
                            <span v-if="item.total_value > 50" class="text-background-400">{{
                                formatNumber(item.total_value) }} ISK</span>
                        </div>
                    </div>
                </template>
                <template #cell-victim="{ item, column, index }: { item: BattleKill, column: any, index: number }">
                    <div class="flex items-center">
                        <img :src="`https://images.eve-kill.com/characters/${item.victim.character_id}/portrait?size=64`"
                            :alt="`Character: ${item.victim.character_name}`" class="w-10 rounded mr-2" />
                        <div>
                            {{ item.victim.character_name }}<br />
                            <span class="text-background-400">{{ truncateString(item.victim.corporation_name, 22)
                            }}</span>
                        </div>
                    </div>
                </template>
                <template #cell-finalBlow="{ item, column, index }: { item: BattleKill, column: any, index: number }">
                    <template v-if="Array.isArray(item.attackers)">
                        <template v-for="attacker in item.attackers"
                            :key="attacker.character_id || attacker.faction_id">
                            <template v-if="attacker.final_blow">
                                <template v-if="item.is_npc">
                                    {{ attacker.faction_name }}<br />
                                    <span class="text-background-400">{{
                                        truncateString(getLocalizedString(attacker.ship_group_name, locale), 22)
                                    }}</span>
                                </template>
                                <template v-else>
                                    {{ attacker.character_name }}<br />
                                    <span class="text-background-400">{{
                                        truncateString(attacker.corporation_name, 22) }}</span>
                                </template>
                            </template>
                        </template>
                    </template>
                </template>
            </Table>
        </div>
        <!-- Red Team Losses -->
        <div>
            <div class="mb-2 text-lg font-bold">Red Team Losses</div>
            <Table :columns="killColumns" :items="redTeamKills" :bordered="true" :striped="false" :hover="true"
                density="normal" background="transparent" table-class="kill-table" :link-fn="generateKillmailLink">
                <template #cell-ship="{ item, column, index }: { item: BattleKill, column: any, index: number }">
                    <div class="flex items-center">
                        <img :src="`https://images.eve-kill.com/types/${item.victim.ship_id}/render?size=64`"
                            :alt="`Ship: ${getLocalizedString(item.victim.ship_name, locale)}`"
                            class="w-10 rounded mr-2" />
                        <div>
                            {{ truncateString(getLocalizedString(item.victim.ship_name, locale), 20) }}<br />
                            <span v-if="item.total_value > 50" class="text-background-400">{{
                                formatNumber(item.total_value) }} ISK</span>
                        </div>
                    </div>
                </template>
                <template #cell-victim="{ item, column, index }: { item: BattleKill, column: any, index: number }">
                    <div class="flex items-center">
                        <img :src="`https://images.eve-kill.com/characters/${item.victim.character_id}/portrait?size=64`"
                            :alt="`Character: ${item.victim.character_name}`" class="w-10 rounded mr-2" />
                        <div>
                            {{ item.victim.character_name }}<br />
                            <span class="text-background-400">{{ truncateString(item.victim.corporation_name, 22)
                            }}</span>
                        </div>
                    </div>
                </template>
                <template #cell-finalBlow="{ item, column, index }: { item: BattleKill, column: any, index: number }">
                    <template v-if="Array.isArray(item.attackers)">
                        <template v-for="attacker in item.attackers"
                            :key="attacker.character_id || attacker.faction_id">
                            <template v-if="attacker.final_blow">
                                <template v-if="item.is_npc">
                                    {{ attacker.faction_name }}<br />
                                    <span class="text-background-400">{{
                                        truncateString(getLocalizedString(attacker.ship_group_name, locale), 22)
                                    }}</span>
                                </template>
                                <template v-else>
                                    {{ attacker.character_name }}<br />
                                    <span class="text-background-400">{{
                                        truncateString(attacker.corporation_name, 22) }}</span>
                                </template>
                            </template>
                        </template>
                    </template>
                </template>
            </Table>
        </div>
    </div>
</template>
<script setup lang="ts">
import Table from '../common/Table.vue'; // Import the Table component
import formatIsk from '~/src/core/utils/formatIsk';
import { useI18n } from 'vue-i18n'; // Import useI18n

interface BattleKill {
    killmail_id: number;
    total_value: number;
    is_npc: boolean;
    victim: {
        ship_id: number;
        ship_name: any; // Assuming this can be a localized object
        character_id: number;
        character_name: string;
        corporation_name: string;
        ship_image_url?: string; // Optional image URL
        character_image_url?: string; // Optional image URL
    };
    attackers: Array<{
        character_id?: number;
        faction_id?: number;
        final_blow: boolean;
        faction_name?: string;
        ship_group_name?: any; // Assuming this can be a localized object
        character_name?: string;
        corporation_name?: string;
    }>;
}

defineProps<{
    blueTeamKills: BattleKill[],
    redTeamKills: BattleKill[]
}>();

const { locale } = useI18n();

const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    return obj[localeKey] || obj.en || "";
};

function truncateString(str: any, num: number) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.length <= num ? str : str.slice(0, num) + '...';
}

function formatNumber(n: number) {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const generateKillmailLink = (item: BattleKill): string => {
    return `/kill/${item.killmail_id}`;
};

const killColumns = [
    { id: 'ship', header: 'Ship', width: '30%' },
    { id: 'victim', header: 'Victim', width: '30%' },
    { id: 'finalBlow', header: 'Final Blow', width: '40%' },
];
</script>

<style scoped>
/* Add any necessary scoped styles here to match the original table appearance */
.kill-table :deep(.table-header) {
    background-color: rgba(26, 26, 26, 0.5);
    /* Example from TopBox */
    color: #9ca3af;
    /* Example from TopBox */
    text-transform: uppercase;
    font-size: 0.75rem;
    padding: 0.5rem;
    /* Adjust padding */
}

.kill-table :deep(.header-cell) {
    padding: 0 0.5rem;
    /* Adjust padding */
}

.kill-table :deep(.table-row) {
    border-bottom: 1px solid #282828;
    /* Example from original table */
    transition: background-color 0.3s ease;
    cursor: pointer;
}

.kill-table :deep(.table-row:hover) {
    background-color: #1a1a1a;
    /* Example from original table */
}

.kill-table :deep(.body-cell) {
    padding: 0.5rem;
    /* Adjust padding */
}
</style>
