<template>
    <div class="kills-grid" :class="gridColumnsClass" ref="containerRef">
        <!-- Dynamic Team Kills -->
        <div v-for="sideId in sideIds" :key="sideId" class="team-kills-column">
            <Card>
                <template #header>
                    <h3 class="section-title">{{ getSideName(sideId) }} {{ t('kills') }}</h3>
                </template>
                <template #body>
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
                                        :id="item.victim.corporation_id" :size="24"
                                        class="portrait corporation-portrait"
                                        :style="{ maxWidth: '24px', maxHeight: '24px' }" />
                                    <Image v-if="item.victim?.alliance_id" :type="'alliance'"
                                        :id="item.victim.alliance_id" :size="24" class="portrait alliance-portrait"
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
                                        :id="getFinalBlowAttacker(item).character_id!" :size="48"
                                        class="portrait character-portrait"
                                        :style="{ maxWidth: '48px', maxHeight: '48px' }" />
                                    <div v-else class="portrait character-portrait-placeholder"></div>
                                </div>

                                <!-- Corp/Alliance Stacked -->
                                <div class="corp-alliance-container">
                                    <Image v-if="getFinalBlowAttacker(item)?.corporation_id" :type="'corporation'"
                                        :id="getFinalBlowAttacker(item).corporation_id!" :size="24"
                                        class="portrait corporation-portrait"
                                        :style="{ maxWidth: '24px', maxHeight: '24px' }" />
                                    <Image v-if="getFinalBlowAttacker(item)?.alliance_id" :type="'alliance'"
                                        :id="getFinalBlowAttacker(item).alliance_id!" :size="24"
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
                                    <div v-if="getFinalBlowAttacker(item)?.alliance_name"
                                        class="entity-name alliance-name">
                                        {{ getFinalBlowAttacker(item).alliance_name }}
                                    </div>
                                </div>
                            </div>

                            <!-- Bottom Row: Ship & Kill Details -->
                            <div class="attacker-bottom">
                                <!-- Ship Details -->
                                <div class="ship-details">
                                    <div class="ship-image-container">
                                        <Image :type="'type-render'" :id="item.victim.ship_id" :size="40"
                                            class="ship-image" :style="{ maxWidth: '40px', maxHeight: '40px' }" />
                                    </div>
                                    <div class="ship-info">
                                        <div class="ship-name text-red-500 dark:text-red-400">
                                            {{ getLocalizedString(item.victim.ship_name, locale) || 'Unknown Ship' }}
                                        </div>
                                        <div class="ship-group">
                                            {{ getLocalizedString(item.victim.ship_group_name, locale) }}
                                        </div>
                                    </div>
                                </div>

                                <!-- Kill Details -->
                                <div class="kill-info-container">
                                    <!-- Damage Taken -->
                                    <div class="killmail-damage">
                                        <Icon name="lucide:zap" class="damage-icon" />
                                        <span class="damage-value">{{ formatNumberWithLocale(item.victim.damage_taken ||
                                            0)
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
                </template>
            </Card>
        </div>
    </div>
</template>

<script setup lang="ts">
import moment from 'moment';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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
    const sorted = [...kill.attackers].sort((a, b) => (b.damage_done || 0) - (a.damage_done || 0));
    return sorted[0] || { character_name: 'Unknown', damage_done: 0 };
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
    const date = moment.utc(timeString).local();
    return date.format('YYYY-MM-DD HH:mm');
};

// Format numbers with locale
function formatNumberWithLocale(n: number): string {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(locale.value, { maximumFractionDigits: 0 });
}

// Localization helper
const getLocalizedString = (obj: any, localeKey: string): string => {
    if (!obj) return "";
    if (typeof obj === 'string') return obj;

    // Convert localeKey from 'en-US' to 'en' if necessary
    const lang = localeKey.split('-')[0];

    // Type-safe property access
    if (typeof obj === 'object' && obj !== null && lang) {
        return obj[lang] || obj['en'] || "";
    }

    return "";
};
</script>

<style scoped>
/* Grid Layout */
.kills-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-lg);
    margin-top: var(--space-lg);
}

.single-column {
    grid-template-columns: 1fr;
}

.two-columns {
    grid-template-columns: repeat(2, 1fr);
}

.three-columns {
    grid-template-columns: repeat(3, 1fr);
}

.four-columns {
    grid-template-columns: repeat(4, 1fr);
}

/* Section Title */
.section-title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin: 0;
}

/* Team Column */
.team-kills-column {
    min-width: 0;
}

/* Kill Row Styling */
.attacker-row {
    display: flex;
    flex-direction: column;
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border);
    transition: background-color var(--duration-fast) ease;
    color: inherit;
    text-decoration: none;
    position: relative;
}

.attacker-row:hover {
    background-color: var(--color-background-hover);
}

/* Section Labels */
.section-label {
    position: absolute;
    top: var(--space-xs);
    right: var(--space-xs);
    font-size: var(--text-xs);
    font-weight: var(--font-bold);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    text-transform: uppercase;
}

.victim-label {
    background-color: var(--color-danger-alpha);
    color: var(--color-danger);
}

.finalblow-label {
    background-color: var(--color-success-alpha);
    color: var(--color-success);
}

/* Section Layouts */
.attacker-top {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    margin-bottom: var(--space-sm);
    width: 100%;
    padding: var(--space-xs);
    position: relative;
    background-color: var(--color-danger-alpha);
    border-radius: var(--radius-sm);
}

.attacker-middle {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    margin-bottom: var(--space-sm);
    width: 100%;
    padding: var(--space-xs);
    position: relative;
    background-color: var(--color-success-alpha);
    border-radius: var(--radius-sm);
}

.attacker-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: var(--space-sm) var(--space-xs) 0;
    border-top: 1px solid var(--color-border-subtle);
}

/* Portrait Containers */
.portrait-container {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.portrait {
    border-radius: 50%;
    background-color: var(--color-background-tertiary);
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
}

.character-portrait {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    flex-grow: 0;
}

.character-portrait-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: var(--color-background-tertiary);
    border: 1px dashed var(--color-border-subtle);
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
}

.corporation-portrait,
.alliance-portrait {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    flex-grow: 0;
}

/* Ship Details */
.ship-details {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    min-width: 0;
    flex-grow: 1;
}

.ship-image-container {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ship-image {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    background-color: var(--color-background-tertiary);
    border: 1px solid var(--color-border);
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
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ship-group {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Kill Information */
.kill-info-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-xs);
    flex-shrink: 0;
}

.killmail-damage {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-xs);
    color: var(--color-danger);
}

.damage-icon {
    width: 12px;
    height: 12px;
}

.damage-value {
    font-weight: var(--font-medium);
}

.killmail-value {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--color-info);
}

.killmail-time {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
}

/* Entity Names */
.name-container {
    flex-grow: 1;
    min-width: 0;
}

.entity-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
}

.character-name {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
}

.corporation-name {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
}

.alliance-name {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
}

/* Empty State */
.empty-state {
    padding: var(--space-xl);
    text-align: center;
    color: var(--color-text-tertiary);
    font-style: italic;
}

/* Semantic Color Classes */
.text-red-500,
.text-red-400 {
    color: var(--color-danger) !important;
}

/* Responsive Design */
@media (min-width: 768px) {
    .md\:grid-cols-1 {
        grid-template-columns: 1fr;
    }
}

@media (min-width: 1280px) {
    .xl\:grid-cols-2 {
        grid-template-columns: repeat(2, 1fr);
    }

    .xl\:grid-cols-3 {
        grid-template-columns: repeat(3, 1fr);
    }

    .xl\:grid-cols-4 {
        grid-template-columns: repeat(4, 1fr);
    }
}

@media (max-width: 1200px) {

    .xl\:grid-cols-4,
    .xl\:grid-cols-3 {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {

    .xl\:grid-cols-2,
    .xl\:grid-cols-3,
    .xl\:grid-cols-4 {
        grid-template-columns: 1fr;
    }

    .attacker-bottom {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-sm);
    }

    .kill-info-container {
        align-self: flex-end;
        align-items: flex-start;
    }
}
</style>
