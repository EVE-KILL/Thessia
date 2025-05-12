<template>
    <div class="p-4 bg-background-900 rounded-lg shadow-lg text-black dark:text-white">
        <!-- Loading state -->
        <div v-if="isLoading">
            <div class="flex flex-col items-center justify-center py-12">
                <UIcon name="lucide:loader" class="w-12 h-12 animate-spin text-primary mb-4" />
                <span class="text-xl font-medium">{{ t('battle.loading') }}</span>
            </div>
        </div>

        <!-- Battle data display -->
        <div v-else-if="battle">
            <!-- Top Info -->
            <div class="battle-topbox mb-6">
                <div class="flex items-center gap-2 text-2xl font-extrabold text-black dark:text-white mb-1">
                    <UIcon name="lucide:map-pin" class="w-7 h-7 text-blue-400" />
                    <span>
                        {{ t('battle.in_system') }}:
                        <span class="text-blue-500">{{ battle.system_name || t('battle.unknown_system') }}</span>
                        <span class="ml-2 text-xs px-2 py-1 rounded bg-background-700 text-background-100 align-middle">
                            {{ battle.system_security ? battle.system_security.toFixed(2) : 'N/A' }}
                        </span>
                        <span class="ml-2 text-background-400">
                            ({{ getLocalizedString(battle.region_name, locale) }})
                        </span>
                    </span>
                </div>
                <div class="flex flex-wrap gap-6 mt-2 text-base font-medium">
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:clock" class="w-5 h-5 text-background-400" />
                        <span>{{ t('battle.start_time') }}:</span>
                        <span class="font-semibold">{{ formatDate(battle.start_time) }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:clock" class="w-5 h-5 text-background-400" />
                        <span>{{ t('battle.end_time') }}:</span>
                        <span class="font-semibold">{{ formatDate(battle.end_time) }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:timer" class="w-5 h-5 text-background-400" />
                        <span>{{ t('battle.duration') }}:</span>
                        <span class="font-semibold">{{ duration(battle.start_time, battle.end_time) }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:coins" class="w-5 h-5 text-yellow-500" />
                        <span>{{ t('battle.isk_lost') }}:</span>
                        <span class="font-semibold">{{ formatIsk(blueTeamStats.iskLost + redTeamStats.iskLost) }}
                            ISK</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:ship" class="w-5 h-5 text-background-400" />
                        <span>{{ t('battle.ships_lost') }}:</span>
                        <span class="font-semibold">{{ blueTeamStats.shipsLost + redTeamStats.shipsLost }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <UIcon name="lucide:flame" class="w-5 h-5 text-red-500" />
                        <span>{{ t('battle.damage_inflicted') }}:</span>
                        <span class="font-semibold">{{ formatNumber(blueTeamStats.damageInflicted +
                            redTeamStats.damageInflicted) }}</span>
                    </div>
                </div>
            </div>

            <!-- Teams Table -->
            <BattleTeams :blueTeamStats="blueTeamStats" :redTeamStats="redTeamStats"
                :blueTeamAlliances="blueTeamAlliances" :redTeamAlliances="redTeamAlliances"
                :blueTeamCorporations="blueTeamCorporations" :redTeamCorporations="redTeamCorporations" />

            <!-- Tabs -->
            <div class="mb-4">
                <UTabs :items="tabs" :ui="tabsUi" color="neutral">
                    <template #overview>
                        <BattleOverview v-if="battle" :battle="battle" />
                    </template>
                    <template #kills>
                        <BattleKills :blueTeamKills="blueTeamKills" :redTeamKills="redTeamKills" />
                    </template>
                    <template #alliances>
                        <BattleAlliances :blueTeamAlliances="blueTeamAlliances" :redTeamAlliances="redTeamAlliances" />
                    </template>
                    <template #corporations>
                        <BattleCorporations :blueTeamCorporations="blueTeamCorporations"
                            :redTeamCorporations="redTeamCorporations" />
                    </template>
                    <template #characters>
                        <BattleCharacters :blueTeamCharacters="blueTeamCharacters"
                            :redTeamCharacters="redTeamCharacters" />
                    </template>
                    <template #timeline>
                        <BattleTimeline v-if="battle" :killmails="killmails" :battle="battle" />
                    </template>
                </UTabs>
            </div>
        </div>

        <!-- Error state -->
        <div v-else>
            <div class="flex flex-col items-center justify-center py-12">
                <UIcon name="lucide:alert-circle" class="w-12 h-12 text-red-500 mb-4" />
                <span class="text-xl font-medium">{{ loadingError || t('battle.no_battle_found') }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { locale, t } = useI18n();
const route = useRoute();

const entityId = computed(() => route.params.id as string || null);

// State management
const battle = ref<any>(null);
const killmails = ref<any[]>([]);
const isLoading = ref(true);
const loadingError = ref<string | null>(null);

// Team data refs
const blueTeamKills = ref<any[]>([]);
const redTeamKills = ref<any[]>([]);
const blueTeamStats = ref({ iskLost: 0, shipsLost: 0, damageInflicted: 0 });
const redTeamStats = ref({ iskLost: 0, shipsLost: 0, damageInflicted: 0 });
const blueTeamAlliances = ref<any[]>([]);
const redTeamAlliances = ref<any[]>([]);
const blueTeamCorporations = ref<any[]>([]);
const redTeamCorporations = ref<any[]>([]);
const blueTeamCharacters = ref<any[]>([]);
const redTeamCharacters = ref<any[]>([]);

// Fetch data from both endpoints simultaneously
async function fetchBattleData() {
    if (!entityId.value) return;

    isLoading.value = true;
    loadingError.value = null;
    battle.value = null;

    try {
        // Fetch from both endpoints in parallel
        const [battleResponse, killmailBattleResponse] = await Promise.all([
            $fetch(`/api/battles/killmail/${entityId.value}/saved`).catch(() => null),
            $fetch(`/api/battles/killmail/${entityId.value}`).catch(() => null)
        ]);

        // Handle the different possible outcomes
        if (battleResponse && killmailBattleResponse) {
            // Edge case: Both endpoints returned data - this shouldn't happen
            processBattleData(battleResponse);
        } else if (battleResponse) {
            // Battle endpoint had data
            processBattleData(battleResponse);
        } else if (killmailBattleResponse) {
            // Killmail endpoint had data
            processBattleData(killmailBattleResponse);
        } else {
            // Neither endpoint had data
            loadingError.value = t('battle.no_battle_found');
        }
    } catch (error) {
        loadingError.value = t('battle.error_loading');
    } finally {
        isLoading.value = false;
    }
}

// Process the battle data once we have it
async function processBattleData(data: any) {
    battle.value = data;

    const allKillmailIds = [
        ...(data?.killmail_ids || []),
        ...(data?.blue_team_kill_ids || []),
        ...(data?.red_team_kill_ids || []),
    ];

    // Get unique IDs
    const uniqueKillmailIds = Array.from(new Set(allKillmailIds));

    if (uniqueKillmailIds.length > 0) {
        try {
            // Fetch full killmail objects using the batch endpoint
            const fetchedKillmails: any[] = await $fetch('/api/killmails/batch', {
                method: 'POST',
                body: { ids: uniqueKillmailIds }
            });

            // Create a lookup map for easy access
            const killmailMap = new Map(fetchedKillmails.map(km => [km.killmail_id, km]));

            // Populate killmails for timeline (sorted by time)
            killmails.value = (data?.killmail_ids || [])
                .map((id: number) => killmailMap.get(id))
                .filter((km: any) => km !== undefined)
                .sort((a: any, b: any) => new Date(a.kill_time).getTime() - new Date(b.kill_time).getTime());

            // Populate team kills (sorted by value)
            blueTeamKills.value = (data?.blue_team_kill_ids || [])
                .map((id: number) => killmailMap.get(id))
                .filter((km: any) => km !== undefined)
                .sort((a: any, b: any) => (b.total_value || 0) - (a.total_value || 0));

            redTeamKills.value = (data?.red_team_kill_ids || [])
                .map((id: number) => killmailMap.get(id))
                .filter((km: any) => km !== undefined)
                .sort((a: any, b: any) => (b.total_value || 0) - (a.total_value || 0));

            // Populate stats and entity lists directly from data
            blueTeamStats.value = data?.blue_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
            redTeamStats.value = data?.red_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
            blueTeamAlliances.value = data?.blue_team_alliances_stats || [];
            redTeamAlliances.value = data?.red_team_alliances_stats || [];
            blueTeamCorporations.value = data?.blue_team_corporations_stats || [];
            redTeamCorporations.value = data?.red_team_corporations_stats || [];
            blueTeamCharacters.value = data?.blue_team_characters_stats || [];
            redTeamCharacters.value = data?.red_team_characters_stats || [];
        } catch (error) {
            console.error('Error fetching killmails in batch:', error);
            // Initialize empty arrays if killmail fetching fails
            killmails.value = [];
            blueTeamKills.value = [];
            redTeamKills.value = [];
        }
    } else {
        // No killmail IDs found in data
        killmails.value = [];
        blueTeamKills.value = [];
        redTeamKills.value = [];
        blueTeamStats.value = data?.blue_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
        redTeamStats.value = data?.red_team_stats || { iskLost: 0, shipsLost: 0, damageInflicted: 0 };
        blueTeamAlliances.value = data?.blue_team_alliances_stats || [];
        redTeamAlliances.value = data?.red_team_alliances_stats || [];
        blueTeamCorporations.value = data?.blue_team_corporations_stats || [];
        redTeamCorporations.value = data?.red_team_corporations_stats || [];
        blueTeamCharacters.value = data?.blue_team_characters_stats || [];
        redTeamCharacters.value = data?.red_team_characters_stats || [];
    }
}

// Trigger data fetch when entityId changes
watchEffect(() => {
    if (entityId.value) {
        fetchBattleData();
    }
});

// Add explicit onMounted to ensure it runs on initial load
onMounted(() => {
    if (entityId.value) {
        fetchBattleData();
    }
});

// Tabs and other utility functions
const tabs = [
    { label: 'Overview', slot: 'overview' },
    { label: 'Kills', slot: 'kills' },
    { label: 'Alliances', slot: 'alliances' },
    { label: 'Corporations', slot: 'corporations' },
    { label: 'Characters', slot: 'characters' },
    { label: 'Timeline', slot: 'timeline' }
];

const tabsUi = {
    list: "mb-0",
    tab: "p-2 text-sm font-semibold text-white rounded-lg bg-background-700 hover:bg-background-600 ml-2"
};

const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    return obj[localeKey] || obj.en || "";
};

function formatNumber(n: number) {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(dateInput: Date | number | string) {
    if (dateInput instanceof Date) {
        return dateInput.toLocaleString();
    }
    if (typeof dateInput === 'string') {
        return new Date(dateInput).toLocaleString();
    }
    return new Date(dateInput * 1000).toLocaleString();
}

function duration(start: Date | number | string, end: Date | number | string) {
    let startMs: number, endMs: number;

    if (start instanceof Date) {
        startMs = start.getTime();
    } else if (typeof start === 'string') {
        startMs = new Date(start).getTime();
    } else {
        startMs = start * 1000;
    }

    if (end instanceof Date) {
        endMs = end.getTime();
    } else if (typeof end === 'string') {
        endMs = new Date(end).getTime();
    } else {
        endMs = end * 1000;
    }

    const dSeconds = Math.floor((endMs - startMs) / 1000);
    const m = Math.floor(dSeconds / 60);
    const s = dSeconds % 60;
    return `${m}m ${s}s`;
}
</script>

<style scoped>
/* Top section improvements */
.bg-background-800 {
    background-color: var(--color-background-800);
}

.border-background-700 {
    border-color: var(--color-background-700);
}

.text-blue-500 {
    color: #3b82f6;
}

.text-yellow-500 {
    color: #eab308;
}

.text-red-500 {
    color: #ef4444;
}

.rounded-lg {
    border-radius: 0.5rem;
}

.battle-topbox {
    background: light-dark(rgba(245, 245, 245, 0.7), rgba(26, 26, 26, 0.7));
    border-radius: 0.75rem;
    border: 1.5px solid var(--color-background-700, #282828);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.07);
    padding: 1.5rem 2rem 1.25rem 2rem;
    margin-bottom: 2rem;
    border-bottom: 3px solid var(--color-background-700, #282828);
}
</style>
