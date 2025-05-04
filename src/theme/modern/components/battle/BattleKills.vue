<template>
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Blue Team Losses -->
        <div>
            <div class="mb-2 text-lg font-bold text-black dark:text-white">Blue Team Losses</div>
            <Table :columns="killColumns" :items="blueTeamKills" :bordered="true" :striped="false" :hover="true"
                density="normal" background="transparent" table-class="kill-table" :link-fn="generateKillmailLink">
                <template #cell-ship="{ item }">
                    <div class="flex items-center gap-3">
                        <img :src="`https://images.eve-kill.com/types/${item.victim.ship_id}/render?size=64`"
                            :alt="`Ship: ${getLocalizedString(item.victim.ship_name, locale)}`"
                            class="w-12 h-12 object-cover rounded-md border border-background-700" />
                        <div>
                            <div class="font-semibold text-black dark:text-white">
                                {{ truncateString(getLocalizedString(item.victim.ship_name, locale), 20) }}
                            </div>
                            <div class="text-xs text-background-400">
                                {{ formatNumber(item.total_value) }} ISK
                            </div>
                        </div>
                    </div>
                </template>
                <template #cell-victim="{ item }">
                    <div class="flex items-center gap-3">
                        <img :src="`https://images.eve-kill.com/characters/${item.victim.character_id}/portrait?size=64`"
                            :alt="`Character: ${item.victim.character_name}`"
                            class="w-12 h-12 object-cover rounded-md border border-background-700" />
                        <div>
                            <div class="font-semibold text-black dark:text-white">{{ item.victim.character_name }}</div>
                            <div class="text-xs text-background-400">{{ item.victim.corporation_name }}</div>
                            <div v-if="item.victim.alliance_name" class="text-xs text-background-400">{{
                                item.victim.alliance_name }}</div>
                        </div>
                    </div>
                </template>
                <template #cell-finalBlow="{ item }">
                    <template v-if="Array.isArray(item.attackers)">
                        <template v-for="attacker in item.attackers"
                            :key="attacker.character_id || attacker.faction_id">
                            <template v-if="attacker.final_blow">
                                <div class="flex items-center gap-3">
                                    <img v-if="!item.is_npc"
                                        :src="`https://images.eve-kill.com/characters/${attacker.character_id}/portrait?size=64`"
                                        :alt="attacker.character_name"
                                        class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                    <img v-else
                                        :src="`https://images.eve-kill.com/types/${attacker.ship_type_id || 0}/icon`"
                                        :alt="attacker.faction_name"
                                        class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                    <div>
                                        <div class="font-semibold text-black dark:text-white">
                                            {{ item.is_npc ? attacker.faction_name : attacker.character_name }}
                                        </div>
                                        <div class="text-xs text-background-400">
                                            {{ item.is_npc ? getLocalizedString(attacker.ship_group_name, locale) :
                                                attacker.corporation_name }}
                                        </div>
                                        <div v-if="!item.is_npc && attacker.alliance_name"
                                            class="text-xs text-background-400">
                                            {{ attacker.alliance_name }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </template>
                    </template>
                </template>
            </Table>
        </div>
        <!-- Red Team Losses -->
        <div>
            <div class="mb-2 text-lg font-bold text-black dark:text-white">Red Team Losses</div>
            <Table :columns="killColumns" :items="redTeamKills" :bordered="true" :striped="false" :hover="true"
                density="normal" background="transparent" table-class="kill-table" :link-fn="generateKillmailLink">
                <template #cell-ship="{ item }">
                    <div class="flex items-center gap-3">
                        <img :src="`https://images.eve-kill.com/types/${item.victim.ship_id}/render?size=64`"
                            :alt="`Ship: ${getLocalizedString(item.victim.ship_name, locale)}`"
                            class="w-12 h-12 object-cover rounded-md border border-background-700" />
                        <div>
                            <div class="font-semibold text-black dark:text-white">
                                {{ truncateString(getLocalizedString(item.victim.ship_name, locale), 20) }}
                            </div>
                            <div class="text-xs text-background-400">
                                {{ formatNumber(item.total_value) }} ISK
                            </div>
                        </div>
                    </div>
                </template>
                <template #cell-victim="{ item }">
                    <div class="flex items-center gap-3">
                        <img :src="`https://images.eve-kill.com/characters/${item.victim.character_id}/portrait?size=64`"
                            :alt="`Character: ${item.victim.character_name}`"
                            class="w-12 h-12 object-cover rounded-md border border-background-700" />
                        <div>
                            <div class="font-semibold text-black dark:text-white">{{ item.victim.character_name }}</div>
                            <div class="text-xs text-background-400">{{ item.victim.corporation_name }}</div>
                            <div v-if="item.victim.alliance_name" class="text-xs text-background-400">{{
                                item.victim.alliance_name }}</div>
                        </div>
                    </div>
                </template>
                <template #cell-finalBlow="{ item }">
                    <template v-if="Array.isArray(item.attackers)">
                        <template v-for="attacker in item.attackers"
                            :key="attacker.character_id || attacker.faction_id">
                            <template v-if="attacker.final_blow">
                                <div class="flex items-center gap-3">
                                    <img v-if="!item.is_npc"
                                        :src="`https://images.eve-kill.com/characters/${attacker.character_id}/portrait?size=64`"
                                        :alt="attacker.character_name"
                                        class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                    <img v-else
                                        :src="`https://images.eve-kill.com/types/${attacker.ship_type_id || 0}/icon`"
                                        :alt="attacker.faction_name"
                                        class="w-12 h-12 object-cover rounded-md border border-background-700" />
                                    <div>
                                        <div class="font-semibold text-black dark:text-white">
                                            {{ item.is_npc ? attacker.faction_name : attacker.character_name }}
                                        </div>
                                        <div class="text-xs text-background-400">
                                            {{ item.is_npc ? getLocalizedString(attacker.ship_group_name, locale) :
                                                attacker.corporation_name }}
                                        </div>
                                        <div v-if="!item.is_npc && attacker.alliance_name"
                                            class="text-xs text-background-400">
                                            {{ attacker.alliance_name }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </template>
                    </template>
                </template>
            </Table>
        </div>
    </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface BattleKill {
    killmail_id: number;
    total_value: number;
    is_npc: boolean;
    victim: {
        ship_id: number;
        ship_name: any;
        character_id: number;
        character_name: string;
        corporation_name: string;
        alliance_name?: string;
        ship_image_url?: string;
        character_image_url?: string;
    };
    attackers: Array<{
        character_id?: number;
        faction_id?: number;
        final_blow: boolean;
        faction_name?: string;
        ship_group_name?: any;
        character_name?: string;
        corporation_name?: string;
        alliance_name?: string;
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
.kill-table :deep(.table-header) {
    background-color: rgba(26, 26, 26, 0.5);
    color: #9ca3af;
    text-transform: uppercase;
    font-size: 0.75rem;
    padding: 0.5rem;
}

.kill-table :deep(.header-cell) {
    padding: 0 0.5rem;
}

.kill-table :deep(.table-row) {
    border-bottom: 1px solid #282828;
    transition: background-color 0.3s ease;
    cursor: pointer;
}

.kill-table :deep(tbody tr):hover {
    background: light-dark(rgba(229, 231, 235, 0.15), rgba(35, 35, 35, 0.5));
}

.kill-table :deep(.body-cell) {
    padding: 0.5rem;
}

.w-12.h-12 {
    width: 48px;
    height: 48px;
    border-radius: 0.375rem;
    object-fit: cover;
    background: #18181b;
    border: 1px solid #282828;
}
</style>
