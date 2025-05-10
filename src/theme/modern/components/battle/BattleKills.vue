<template>
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Blue Team Losses -->
        <div>
            <div class="mb-2 text-lg font-bold text-black dark:text-white">Blue Team Losses</div>
            <Table :columns="killColumns" :items="blueTeamKills" :bordered="true" :striped="false" :hover="true"
                density="normal" background="transparent" table-class="kill-table" :link-fn="generateKillmailLink">
                <template #cell-ship="{ item: rawItem }">
                    <div v-if="rawItem" class="flex items-center gap-3">
                        <Image v-if="(rawItem as BattleKill).victim && (rawItem as BattleKill).victim.ship_id"
                            type="type-render" :id="(rawItem as BattleKill).victim.ship_id!"
                            :alt="`Ship: ${getLocalizedString((rawItem as BattleKill).victim.ship_name, locale) || 'Unknown Ship'}`"
                            :size="64" class="w-12 h-12" />
                        <div v-else
                            class="w-12 h-12 bg-background-700 rounded-md flex items-center justify-center text-xs text-background-400">
                            No Ship ID</div>
                        <div>
                            <div class="font-semibold text-black dark:text-white">
                                {{ truncateString(getLocalizedString((rawItem as BattleKill).victim.ship_name, locale)
                                    || 'Unknown Ship',
                                    20) }}
                            </div>
                            <div class="text-xs text-background-400">
                                {{ formatNumber((rawItem as BattleKill).total_value) }} ISK
                            </div>
                        </div>
                    </div>
                </template>
                <template #cell-victim="{ item: rawItem }">
                    <div v-if="rawItem" class="flex items-center gap-3">
                        <Image v-if="(rawItem as BattleKill).victim && (rawItem as BattleKill).victim.character_id"
                            type="character" :id="(rawItem as BattleKill).victim.character_id!"
                            :alt="`Character: ${(rawItem as BattleKill).victim.character_name || 'Unknown Pilot'}`"
                            :size="64" class="w-12 h-12" />
                        <div v-else
                            class="w-12 h-12 bg-background-700 rounded-md flex items-center justify-center text-xs text-background-400">
                            No Pilot ID</div>
                        <div>
                            <div class="font-semibold text-black dark:text-white">
                                {{ (rawItem as BattleKill).victim.character_name || 'Unknown Pilot' }}
                            </div>
                            <div class="text-xs text-background-400">
                                {{ (rawItem as BattleKill).victim.corporation_name || 'Unknown Corporation' }}
                            </div>
                            <div v-if="(rawItem as BattleKill).victim.alliance_name"
                                class="text-xs text-background-400">{{
                                    (rawItem as BattleKill).victim.alliance_name }}</div>
                        </div>
                    </div>
                </template>
                <template #cell-finalBlow="{ item: rawItem }">
                    <template v-if="rawItem && Array.isArray((rawItem as BattleKill).attackers)">
                        <template v-for="attacker in (rawItem as BattleKill).attackers"
                            :key="attacker.character_id || attacker.faction_id || attacker.ship_type_id">
                            <template v-if="attacker.final_blow">
                                <div class="flex items-center gap-3">
                                    <Image v-if="!(rawItem as BattleKill).is_npc && attacker.character_id"
                                        type="character" :id="attacker.character_id"
                                        :alt="attacker.character_name || 'Unknown Pilot'" :size="64"
                                        class="w-12 h-12" />
                                    <Image v-else-if="(rawItem as BattleKill).is_npc && attacker.ship_type_id"
                                        type="type-icon" :id="attacker.ship_type_id"
                                        :alt="attacker.faction_name || 'NPC Entity'" :size="64" class="w-12 h-12" />
                                    <div v-else
                                        class="w-12 h-12 bg-background-700 rounded-md flex items-center justify-center text-xs text-background-400">
                                        No ID</div>
                                    <div>
                                        <div class="font-semibold text-black dark:text-white">
                                            {{ (rawItem as BattleKill).is_npc ? (attacker.faction_name || 'NPC Faction')
                                                :
                                                (attacker.character_name || 'Unknown Pilot') }}
                                        </div>
                                        <div class="text-xs text-background-400">
                                            {{ (rawItem as BattleKill).is_npc ?
                                                getLocalizedString(attacker.ship_group_name, locale) :
                                                (attacker.corporation_name || "Unknown Corporation") }}
                                        </div>
                                        <div v-if="!(rawItem as BattleKill).is_npc && attacker.alliance_name"
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
                <template #cell-ship="{ item: rawItem }">
                    <div v-if="rawItem" class="flex items-center gap-3">
                        <Image v-if="(rawItem as BattleKill).victim && (rawItem as BattleKill).victim.ship_id"
                            type="type-render" :id="(rawItem as BattleKill).victim.ship_id!"
                            :alt="`Ship: ${getLocalizedString((rawItem as BattleKill).victim.ship_name, locale) || 'Unknown Ship'}`"
                            :size="64" class="w-12 h-12" />
                        <div v-else
                            class="w-12 h-12 bg-background-700 rounded-md flex items-center justify-center text-xs text-background-400">
                            No Ship ID</div>
                        <div>
                            <div class="font-semibold text-black dark:text-white">
                                {{ truncateString(getLocalizedString((rawItem as BattleKill).victim.ship_name, locale)
                                    || 'Unknown Ship',
                                    20) }}
                            </div>
                            <div class="text-xs text-background-400">
                                {{ formatNumber((rawItem as BattleKill).total_value) }} ISK
                            </div>
                        </div>
                    </div>
                </template>
                <template #cell-victim="{ item: rawItem }">
                    <div v-if="rawItem" class="flex items-center gap-3">
                        <Image v-if="(rawItem as BattleKill).victim && (rawItem as BattleKill).victim.character_id"
                            type="character" :id="(rawItem as BattleKill).victim.character_id!"
                            :alt="`Character: ${(rawItem as BattleKill).victim.character_name || 'Unknown Pilot'}`"
                            :size="64" class="w-12 h-12" />
                        <div v-else
                            class="w-12 h-12 bg-background-700 rounded-md flex items-center justify-center text-xs text-background-400">
                            No Pilot ID</div>
                        <div>
                            <div class="font-semibold text-black dark:text-white">
                                {{ (rawItem as BattleKill).victim.character_name || 'Unknown Pilot' }}
                            </div>
                            <div class="text-xs text-background-400">
                                {{ (rawItem as BattleKill).victim.corporation_name || 'Unknown Corporation' }}
                            </div>
                            <div v-if="(rawItem as BattleKill).victim.alliance_name"
                                class="text-xs text-background-400">{{
                                    (rawItem as BattleKill).victim.alliance_name }}</div>
                        </div>
                    </div>
                </template>
                <template #cell-finalBlow="{ item: rawItem }">
                    <template v-if="rawItem && Array.isArray((rawItem as BattleKill).attackers)">
                        <template v-for="attacker in (rawItem as BattleKill).attackers"
                            :key="attacker.character_id || attacker.faction_id || attacker.ship_type_id">
                            <template v-if="attacker.final_blow">
                                <div class="flex items-center gap-3">
                                    <Image v-if="!(rawItem as BattleKill).is_npc && attacker.character_id"
                                        type="character" :id="attacker.character_id"
                                        :alt="attacker.character_name || 'Unknown Pilot'" :size="64"
                                        class="w-12 h-12" />
                                    <Image v-else-if="(rawItem as BattleKill).is_npc && attacker.ship_type_id"
                                        type="type-icon" :id="attacker.ship_type_id"
                                        :alt="attacker.faction_name || 'NPC Entity'" :size="64" class="w-12 h-12" />
                                    <div v-else
                                        class="w-12 h-12 bg-background-700 rounded-md flex items-center justify-center text-xs text-background-400">
                                        No ID</div>
                                    <div>
                                        <div class="font-semibold text-black dark:text-white">
                                            {{ (rawItem as BattleKill).is_npc ? (attacker.faction_name || 'NPC Faction')
                                                :
                                                (attacker.character_name || 'Unknown Pilot') }}
                                        </div>
                                        <div class="text-xs text-background-400">
                                            {{ (rawItem as BattleKill).is_npc ?
                                                getLocalizedString(attacker.ship_group_name, locale) :
                                                (attacker.corporation_name || "Unknown Corporation") }}
                                        </div>
                                        <div v-if="!(rawItem as BattleKill).is_npc && attacker.alliance_name"
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
        ship_id?: number; // Made optional to handle potential missing data
        ship_name: any;
        character_id?: number; // Made optional
        character_name?: string; // Made optional
        corporation_name?: string; // Made optional
        alliance_name?: string;
        // ship_image_url and character_image_url are not used with Image component
    };
    attackers: Array<{
        character_id?: number;
        faction_id?: number; // For NPCs that might not have a character_id but a faction_id
        ship_type_id?: number; // For NPC ship icons
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
