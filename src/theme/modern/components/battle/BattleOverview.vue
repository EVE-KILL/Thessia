<template>
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Blue Team Ships -->
        <div>
            <div class="mb-2 text-lg font-bold text-black dark:text-white">Blue Team Ships</div>
            <Table :columns="overviewColumns" :items="sortedBlueTeamManifest" :bordered="true" :striped="false"
                :hover="true" density="normal" background="transparent" table-class="overview-table"
                :link-fn="generateLink">
                <template
                    #cell-pilot="{ item: rawItem, column: rawColumn, index }: { item: unknown, column: any, index: number }">
                    <div v-if="rawItem && (rawItem as ICharacterShipManifestEntry).character_id"
                        class="flex items-center gap-3"
                        :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost }">
                        <Image :type="'character'" :id="(rawItem as ICharacterShipManifestEntry).character_id!"
                            :alt="`Pilot: ${(rawItem as ICharacterShipManifestEntry).character_name || 'Unknown'}`"
                            :size="64" class="w-12 h-12" :rounded="true" />
                        <div>
                            <div class="font-semibold"
                                :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost, 'text-black dark:text-white': !(rawItem as ICharacterShipManifestEntry).was_lost }">
                                {{ (rawItem as ICharacterShipManifestEntry).character_name || 'Unknown Pilot' }}
                            </div>
                            <div class="text-xs text-background-400">{{ (rawItem as
                                ICharacterShipManifestEntry).corporation_name || 'Unknown Corporation' }}</div>
                            <div v-if="(rawItem as ICharacterShipManifestEntry).alliance_name"
                                class="text-xs text-background-400">
                                {{ (rawItem as ICharacterShipManifestEntry).alliance_name }}
                            </div>
                        </div>
                    </div>
                    <div v-else-if="rawItem" class="flex items-center gap-3"
                        :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost }">
                        <!-- Fallback for missing character_id -->
                        <div
                            class="w-12 h-12 bg-background-700 rounded-md flex items-center justify-center text-background-400 text-xs">
                            No ID</div>
                        <div>
                            <div class="font-semibold"
                                :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost, 'text-black dark:text-white': !(rawItem as ICharacterShipManifestEntry).was_lost }">
                                {{ (rawItem as ICharacterShipManifestEntry).character_name || 'Unknown Pilot' }}
                            </div>
                            <div class="text-xs text-background-400">{{ (rawItem as
                                ICharacterShipManifestEntry).corporation_name || 'Unknown Corporation' }}</div>
                            <div v-if="(rawItem as ICharacterShipManifestEntry).alliance_name"
                                class="text-xs text-background-400">
                                {{ (rawItem as ICharacterShipManifestEntry).alliance_name }}
                            </div>
                        </div>
                    </div>
                </template>
                <template
                    #cell-ship="{ item: rawItem, column: rawColumn, index }: { item: unknown, column: any, index: number }">
                    <div v-if="rawItem" class="flex items-center gap-3"
                        :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost }">
                        <Image :type="'item'" :id="(rawItem as ICharacterShipManifestEntry).ship_type_id"
                            :alt="`Ship: ${getLocalizedString((rawItem as ICharacterShipManifestEntry).ship_name, locale) || 'Unknown'}`"
                            :size="64" class="w-12 h-12" :rounded="true" />
                        <div>
                            <div class="font-semibold"
                                :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost, 'text-black dark:text-white': !(rawItem as ICharacterShipManifestEntry).was_lost }">
                                {{ truncateString(getLocalizedString((rawItem as ICharacterShipManifestEntry).ship_name,
                                    locale) || 'Unknown Ship', 20) }}
                            </div>
                            <div class="text-xs text-background-400">
                                {{ getLocalizedString((rawItem as ICharacterShipManifestEntry).ship_group_name, locale)
                                    || 'Unknown Group' }}
                            </div>
                        </div>
                    </div>
                </template>
            </Table>
        </div>
        <!-- Red Team Ships -->
        <div>
            <div class="mb-2 text-lg font-bold text-black dark:text-white">Red Team Ships</div>
            <Table :columns="overviewColumns" :items="sortedRedTeamManifest" :bordered="true" :striped="false"
                :hover="true" density="normal" background="transparent" table-class="overview-table"
                :link-fn="generateLink">
                <template
                    #cell-pilot="{ item: rawItem, column: rawColumn, index }: { item: unknown, column: any, index: number }">
                    <div v-if="rawItem && (rawItem as ICharacterShipManifestEntry).character_id"
                        class="flex items-center gap-3"
                        :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost }">
                        <Image :type="'character'" :id="(rawItem as ICharacterShipManifestEntry).character_id!"
                            :alt="`Pilot: ${(rawItem as ICharacterShipManifestEntry).character_name || 'Unknown'}`"
                            :size="64" class="w-12 h-12" :rounded="true" />
                        <div>
                            <div class="font-semibold"
                                :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost, 'text-black dark:text-white': !(rawItem as ICharacterShipManifestEntry).was_lost }">
                                {{ (rawItem as ICharacterShipManifestEntry).character_name || 'Unknown Pilot' }}
                            </div>
                            <div class="text-xs text-background-400">{{ (rawItem as
                                ICharacterShipManifestEntry).corporation_name || 'Unknown Corporation' }}</div>
                            <div v-if="(rawItem as ICharacterShipManifestEntry).alliance_name"
                                class="text-xs text-background-400">
                                {{ (rawItem as ICharacterShipManifestEntry).alliance_name }}
                            </div>
                        </div>
                    </div>
                    <div v-else-if="rawItem" class="flex items-center gap-3"
                        :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost }">
                        <!-- Fallback for missing character_id -->
                        <div
                            class="w-12 h-12 bg-background-700 rounded-md flex items-center justify-center text-background-400 text-xs">
                            No ID</div>
                        <div>
                            <div class="font-semibold"
                                :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost, 'text-black dark:text-white': !(rawItem as ICharacterShipManifestEntry).was_lost }">
                                {{ (rawItem as ICharacterShipManifestEntry).character_name || 'Unknown Pilot' }}
                            </div>
                            <div class="text-xs text-background-400">{{ (rawItem as
                                ICharacterShipManifestEntry).corporation_name || 'Unknown Corporation' }}</div>
                            <div v-if="(rawItem as ICharacterShipManifestEntry).alliance_name"
                                class="text-xs text-background-400">
                                {{ (rawItem as ICharacterShipManifestEntry).alliance_name }}
                            </div>
                        </div>
                    </div>
                </template>
                <template
                    #cell-ship="{ item: rawItem, column: rawColumn, index }: { item: unknown, column: any, index: number }">
                    <div v-if="rawItem" class="flex items-center gap-3"
                        :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost }">
                        <Image :type="'item'" :id="(rawItem as ICharacterShipManifestEntry).ship_type_id"
                            :alt="`Ship: ${getLocalizedString((rawItem as ICharacterShipManifestEntry).ship_name, locale) || 'Unknown'}`"
                            :size="64" class="w-12 h-12" :rounded="true" />
                        <div>
                            <div class="font-semibold"
                                :class="{ 'text-red-500 dark:text-red-400': (rawItem as ICharacterShipManifestEntry).was_lost, 'text-black dark:text-white': !(rawItem as ICharacterShipManifestEntry).was_lost }">
                                {{ truncateString(getLocalizedString((rawItem as ICharacterShipManifestEntry).ship_name,
                                    locale) || 'Unknown Ship', 20) }}
                            </div>
                            <div class="text-xs text-background-400">
                                {{ getLocalizedString((rawItem as ICharacterShipManifestEntry).ship_group_name, locale)
                                    || 'Unknown Group' }}
                            </div>
                        </div>
                    </div>
                </template>
            </Table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

// Define the structure for a ship manifest entry, aligning with server/interfaces/IBattles.ts
interface ICharacterShipManifestEntry {
    character_id?: number;
    character_name?: string;
    corporation_id?: number;
    corporation_name?: string;
    alliance_id?: number;
    alliance_name?: string;
    ship_type_id: number; // Required for ship image
    ship_name: any; // Localized object e.g. { en: 'Rifter', de: 'Rifter' } or string
    ship_group_id?: number;
    ship_group_name?: any; // Localized object or string
    was_lost: boolean;
    killmail_id_if_lost?: number;
}

// Define the structure for the battle prop
interface IBattle {
    blue_team_ship_manifest: ICharacterShipManifestEntry[];
    red_team_ship_manifest: ICharacterShipManifestEntry[];
    // Potentially other battle properties
}

const props = defineProps<{
    battle: IBattle;
}>();

const { locale } = useI18n();

const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    // Convert localeKey from 'en-US' to 'en' if necessary
    const lang = localeKey.split('-')[0];
    return obj[lang] || obj.en || (typeof obj === 'string' ? obj : "");
};

function truncateString(str: any, num: number) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.length <= num ? str : str.slice(0, num) + '...';
}

const sortManifest = (manifest: ICharacterShipManifestEntry[]): ICharacterShipManifestEntry[] => {
    if (!manifest) return [];
    return [...manifest].sort((a, b) => {
        // Handle cases where a or b might be null/undefined
        if (!a && !b) return 0;
        if (!a) return 1; // a is null/undefined, b is not, so a comes after b
        if (!b) return -1; // b is null/undefined, a is not, so a comes before b

        // Sort by was_lost (true first)
        if (a.was_lost && !b.was_lost) return -1;
        if (!a.was_lost && b.was_lost) return 1;

        // Then by character_name (ascending)
        const nameA = a.character_name;
        const nameB = b.character_name;

        if (nameA && nameB) {
            return nameA.localeCompare(nameB);
        }
        if (nameA) return -1; // a has name, b doesn't, so a comes first
        if (nameB) return 1;  // b has name, a doesn't, so b comes first
        return 0; // both names are missing or invalid, consider them equal for this criterion
    });
};

const sortedBlueTeamManifest = computed(() => sortManifest(props.battle.blue_team_ship_manifest));
const sortedRedTeamManifest = computed(() => sortManifest(props.battle.red_team_ship_manifest));

const generateLink = (item: ICharacterShipManifestEntry): string => {
    if (item.was_lost && item.killmail_id_if_lost) {
        return `/kill/${item.killmail_id_if_lost}`;
    }
    return `/character/${item.character_id}`;
};

const overviewColumns = [
    { id: 'pilot', header: 'Pilot', width: '50%' },
    { id: 'ship', header: 'Ship', width: '50%' },
];
</script>

<style scoped>
.overview-table :deep(.table-header) {
    background-color: rgba(26, 26, 26, 0.5);
    /* From BattleKills.vue */
    color: #9ca3af;
    /* From BattleKills.vue */
    text-transform: uppercase;
    /* From BattleKills.vue */
    font-size: 0.75rem;
    /* From BattleKills.vue */
    padding: 0.5rem;
    /* From BattleKills.vue */
}

.overview-table :deep(.header-cell) {
    padding: 0 0.5rem;
    /* From BattleKills.vue */
}

.overview-table :deep(.table-row) {
    border-bottom: 1px solid #282828;
    /* From BattleKills.vue */
    transition: background-color 0.3s ease;
    /* From BattleKills.vue */
    cursor: pointer;
    /* From BattleKills.vue */
}

.overview-table :deep(tbody tr):hover {
    background: light-dark(rgba(229, 231, 235, 0.15), rgba(35, 35, 35, 0.5));
    /* From BattleKills.vue */
}

.overview-table :deep(.body-cell) {
    padding: 0.5rem;
    /* From BattleKills.vue */
}

.w-12.h-12 {
    width: 48px;
    /* From BattleKills.vue */
    height: 48px;
    /* From BattleKills.vue */
    border-radius: 0.375rem;
    /* From BattleKills.vue */
    object-fit: cover;
    /* From BattleKills.vue */
    background: #18181b;
    /* From BattleKills.vue */
    border: 1px solid #282828;
    /* From BattleKills.vue */
}

/* Styling for lost ships */
.text-red-500 {
    color: #ef4444;
}

.dark .text-red-400 {
    color: #f87171;
}
</style>
