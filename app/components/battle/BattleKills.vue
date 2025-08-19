<template>
    <div class="mt-4 grid grid-cols-1 gap-4" :class="gridColumnsClass" ref="containerRef">
        <!-- Dynamic Team Kills -->
        <div v-for="sideId in sideIds" :key="sideId" class="team-kills-column">
            <div class="mb-2 text-lg font-bold text-black dark:text-white">
                {{ getSideName(sideId) }} {{ t('kills') }}
            </div>

            <div class="attacker-list bg-background-800 shadow-lg rounded-lg border border-gray-700/30 overflow-hidden">
                <div v-if="teamKills[sideId] && teamKills[sideId].length > 0">
                    <!-- Individual Killmail Row -->
                    <component v-for="item in teamKills[sideId]" :key="item.killmail_id" :is="'a'"
                        :href="`/kill/${item.killmail_id}`" :class="['attacker-row']">
                        <!-- Top row: Victim Information -->
                        <div class="attacker-top">
                            <!-- Section Label -->
                            <div class="section-label victim-label">Victim</div>

                            <!-- Victim Portrait -->
                            <div class="portrait-container">
                                <Image v-if="item.victim?.character_id" :type="'character'"
                                    :id="item.victim.character_id" :size="48" class="portrait character-portrait"
                                    :style="{ maxWidth: '48px', maxHeight: '48px' }" />
                                <div v-else class="portrait character-portrait-placeholder"></div>
                            </div>

                            <!-- Corp/Alliance Stacked -->
                            <div class="corp-alliance-container">
                                <Image v-if="item.victim?.corporation_id" :type="'corporation'"
                                    :id="item.victim.corporation_id" :size="24" class="portrait corporation-portrait"
                                    :style="{ maxWidth: '24px', maxHeight: '24px' }" />
                                <Image v-if="item.victim?.alliance_id" :type="'alliance'" :id="item.victim.alliance_id"
                                    :size="24" class="portrait alliance-portrait"
                                    :style="{ maxWidth: '24px', maxHeight: '24px' }" />
                            </div>

                            <!-- Name Information -->
                            <div class="name-container">
                                <!-- Character Name -->
                                <div class="entity-name character-name text-red-500 dark:text-red-400">
                                    {{ item.victim.character_name || 'Unknown Pilot' }}
                                </div>

                                <!-- Corporation Name -->
                                <div class="entity-name corporation-name">
                                    {{ item.victim.corporation_name || 'Unknown Corporation' }}
                                </div>

                                <!-- Alliance Name -->
                                <div v-if="item.victim?.alliance_name" class="entity-name alliance-name">
                                    {{ item.victim.alliance_name }}
                                </div>
                            </div>
                        </div>

                        <!-- Middle row: Attacker (Final Blow) Information -->
                        <div class="attacker-middle">
                            <!-- Section Label -->
                            <div class="section-label finalblow-label">Final Blow</div>

                            <!-- Final Blow Portrait -->
                            <div class="portrait-container">
                                <Image v-if="getFinalBlowAttacker(item)?.character_id" :type="'character'"
                                    :id="getFinalBlowAttacker(item).character_id" :size="48"
                                    class="portrait character-portrait"
                                    :style="{ maxWidth: '48px', maxHeight: '48px' }" />
                                <div v-else class="portrait character-portrait-placeholder"></div>
                            </div>

                            <!-- Corp/Alliance Stacked -->
                            <div class="corp-alliance-container">
                                <Image v-if="getFinalBlowAttacker(item)?.corporation_id" :type="'corporation'"
                                    :id="getFinalBlowAttacker(item).corporation_id" :size="24"
                                    class="portrait corporation-portrait"
                                    :style="{ maxWidth: '24px', maxHeight: '24px' }" />
                                <Image v-if="getFinalBlowAttacker(item)?.alliance_id" :type="'alliance'"
                                    :id="getFinalBlowAttacker(item).alliance_id" :size="24"
                                    class="portrait alliance-portrait"
                                    :style="{ maxWidth: '24px', maxHeight: '24px' }" />
                            </div>

                            <!-- Name Information -->
                            <div class="name-container">
                                <!-- Character Name -->
                                <div class="entity-name character-name">
                                    {{ getFinalBlowAttacker(item)?.character_name || 'Unknown Pilot' }}
                                </div>

                                <!-- Corporation Name -->
                                <div class="entity-name corporation-name">
                                    {{ getFinalBlowAttacker(item)?.corporation_name || 'Unknown Corporation' }}
                                </div>

                                <!-- Alliance Name -->
                                <div v-if="getFinalBlowAttacker(item)?.alliance_name" class="entity-name alliance-name">
                                    {{ getFinalBlowAttacker(item).alliance_name }}
                                </div>
                            </div>
                        </div>

                        <!-- Bottom Row: Ship & Kill Details -->
                        <div class="attacker-bottom">
                            <!-- Ship Details -->
                            <div class="ship-details">
                                <div class="ship-image-container">
                                    <Image :type="'type-render'" :id="item.victim.ship_id" :size="40" class="ship-image"
                                        :style="{ maxWidth: '40px', maxHeight: '40px' }" />
                                </div>
                                <div class="ship-info">
                                    <div class="ship-name text-red-500 dark:text-red-400">
                                        {{ getLocalizedString(item.victim.ship_name, locale) || 'Unknown Ship' }}
                                    </div>
                                    <div class="ship-group">
                                        {{ getLocalizedString(item.victim.ship_group_name, locale) || 'Unknown Group' }}
                                    </div>
                                </div>
                            </div>

                            <!-- Kill Details -->
                            <div class="kill-info-container">
                                <!-- Damage Taken -->
                                <div class="killmail-damage">
                                    <Icon name="lucide:zap" class="damage-icon" />
                                    <span class="damage-value">{{ formatNumberWithLocale(item.victim.damage_taken || 0)
                                    }}</span>
                                </div>

                                <!-- Value -->
                                <div class="killmail-value">
                                    <span class="value-label">{{ formatIsk(item.total_value || 0) }}</span>
                                </div>

                                <!-- Time -->
                                <div class="killmail-time">
                                    {{ formatTime(item.kill_time) }}
                                </div>
                            </div>
                        </div>
                    </component>
                </div>
                <div v-else class="empty-state">
                    {{ t('noKillsFoundForThisTeam') }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Use the centralized date formatting utility
const { formatSimpleDateTime } = useDateFormatting();

// Define interfaces for props
interface AttackerData {
    character_id?: number;
    character_name?: string;
    corporation_id?: number;
    corporation_name?: string;
    alliance_id?: number;
    alliance_name?: string;
    faction_id?: number;
    faction_name?: string;
    ship_id?: number;
    ship_name?: any;
    ship_group_id?: number;
    ship_group_name?: any;
    final_blow?: boolean;
    damage_done?: number;
}

interface BattleKill {
    killmail_id: number;
    kill_time: string;
    total_value: number;
    is_npc: boolean;
    victim: {
        ship_id: number;
        ship_name: any;
        ship_group_id?: number;
        ship_group_name?: any;
        character_id?: number;
        character_name?: string;
        corporation_id?: number;
        corporation_name?: string;
        alliance_id?: number;
        alliance_name?: string;
        damage_taken?: number;
    };
    attackers: AttackerData[];
}

// Define props
const props = defineProps<{
    teamKills: Record<string, BattleKill[]>;
    sideIds: string[];
}>();

const { locale } = useI18n();
const containerRef = ref<HTMLElement | null>(null);

// Determine grid columns based on number of sides
const gridColumnsClass = computed(() => {
    const count = props.sideIds.length;
    if (count === 0) return '';
    if (count === 1) return 'md:grid-cols-1';
    if (count === 2) return 'xl:grid-cols-2';
    if (count === 3) return 'xl:grid-cols-3';
    return 'xl:grid-cols-4'; // For 4 teams
});

// Get team/side name
const getSideName = (sideId: string): string => {
    // This would ideally come from battle data, for now use the ID
    const names: Record<string, string> = {
        'blue': 'Team A',
        'red': 'Team B',
        'green': 'Team C',
        'yellow': 'Team D'
    };
    return names[sideId] || sideId;
};

// Get the final blow attacker
const getFinalBlowAttacker = (kill: BattleKill): AttackerData => {
    if (!kill.attackers || kill.attackers.length === 0) {
        return { character_name: 'Unknown', damage_done: 0 };
    }
    const finalBlowAttacker = kill.attackers.find(a => a.final_blow);
    if (finalBlowAttacker) return finalBlowAttacker;

    // If no final_blow flag, return the highest damage dealer
    return [...kill.attackers].sort((a, b) => (b.damage_done || 0) - (a.damage_done || 0))[0];
};

// Format ISK values
const formatIsk = (isk: number): string => {
    if (isk >= 1000000000000) {
        return `${(isk / 1000000000000).toFixed(2)}T`;
    } else if (isk >= 1000000000) {
        return `${(isk / 1000000000).toFixed(2)}B`;
    } else if (isk >= 1000000) {
        return `${(isk / 1000000).toFixed(2)}M`;
    } else if (isk >= 1000) {
        return `${(isk / 1000).toFixed(2)}K`;
    }
    return `${isk.toFixed(2)} ISK`;
};

// Format time
const formatTime = (timeString: string): string => {
    return formatSimpleDateTime(timeString);
};

// Format numbers with locale
function formatNumberWithLocale(n: number): string {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(locale.value, { maximumFractionDigits: 0 });
}

// Localization helper
const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    // Convert localeKey from 'en-US' to 'en' if necessary
    const lang = localeKey.split('-')[0];
    return obj[lang] || obj.en || (typeof obj === 'string' ? obj : "");
};
</script>

<style scoped>
/* Team column sizing */
.team-kills-column {
    min-width: 0;
    /* Allow columns to shrink */
}

/* Attacker List Styling */
.attacker-list {
    border: 1px solid rgba(75, 85, 99, 0.2);
    background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.4));
}

/* Make attacker-row act like a link */
.attacker-row {
    display: flex;
    flex-direction: column;
    padding: 0.75rem;
    border-bottom: 1px solid rgba(75, 85, 99, 0.2);
    transition: background-color 0.15s ease;
    color: inherit;
    text-decoration: none;
    position: relative;
}

.attacker-row:hover {
    background-color: light-dark(rgba(243, 244, 246, 0.7), rgba(31, 41, 55, 0.7));
}

/* Section label styling */
.section-label {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 2px;
    text-transform: uppercase;
}

.victim-label {
    background-color: rgba(239, 68, 68, 0.2);
    color: #ef4444;
}

.finalblow-label {
    background-color: rgba(34, 197, 94, 0.2);
    color: #22c55e;
}

/* Top section - victim information */
.attacker-top {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.5rem;
    width: 100%;
    padding: 4px;
    position: relative;
    background-color: rgba(239, 68, 68, 0.05);
    border-radius: 4px;
}

/* Middle section - attacker information */
.attacker-middle {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.5rem;
    width: 100%;
    padding: 4px;
    position: relative;
    background-color: rgba(34, 197, 94, 0.05);
    border-radius: 4px;
}

.portrait-container {
    flex-shrink: 0;
    width: 48px;
    /* Fixed width */
    height: 48px;
    /* Fixed height */
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    /* Prevent any overflow */
}

.portrait {
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.1);
    object-fit: contain;
    /* Ensure the image fits without stretching */
    max-width: 100%;
    max-height: 100%;
}

.character-portrait {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    /* Prevent flexbox from shrinking the image */
    flex-grow: 0;
    /* Prevent flexbox from growing the image */
}

.character-portrait-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: rgba(100, 100, 100, 0.1);
    border: 1px dashed rgba(128, 128, 128, 0.3);
    flex-shrink: 0;
    flex-grow: 0;
}

.corp-alliance-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 48px;
    flex-shrink: 0;
    width: 24px;
    /* Fixed width container */
}

.corporation-portrait,
.alliance-portrait {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    flex-grow: 0;
}

/* Bottom section - ship and kill details */
.attacker-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 8px 4px 0;
    border-top: 1px solid rgba(75, 85, 99, 0.1);
}

.ship-details {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex-grow: 1;
}

.ship-image-container {
    flex-shrink: 0;
    width: 40px;
    /* Fixed width */
    height: 40px;
    /* Fixed height */
    display: flex;
    align-items: center;
    justify-content: center;
}

.ship-image {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(75, 85, 99, 0.2);
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
}

.ship-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.ship-name {
    font-size: 0.85rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ship-group {
    font-size: 0.7rem;
    color: light-dark(#6b7280, #9ca3af);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.kill-info-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.15rem;
    flex-shrink: 0;
}

.killmail-damage {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #ef4444;
    /* Red for damage */
}

.damage-icon {
    width: 12px;
    height: 12px;
}

.damage-value {
    font-weight: 500;
}

.killmail-value {
    font-size: 0.85rem;
    font-weight: 600;
    color: #38bdf8;
    /* Light blue for ISK */
}

.killmail-time {
    font-size: 0.7rem;
    color: light-dark(#6b7280, #9ca3af);
}

/* Empty state styling */
.empty-state {
    padding: 1.5rem;
    text-align: center;
    color: light-dark(#6b7280, #9ca3af);
    font-style: italic;
}

/* Responsive adjustments for team columns */
@media (max-width: 1200px) {

    .xl\:grid-cols-4,
    .xl\:grid-cols-3 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 768px) {

    .xl\:grid-cols-2,
    .xl\:grid-cols-3,
    .xl\:grid-cols-4 {
        grid-template-columns: minmax(0, 1fr);
    }

    .attacker-bottom {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .kill-info-container {
        align-self: flex-end;
        align-items: flex-start;
    }
}

/* Red text for victims */
.text-red-500 {
    color: #ef4444 !important;
}

.dark .text-red-400 {
    color: #f87171 !important;
}
</style>
