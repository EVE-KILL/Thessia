<template>
    <div class="battle-overview-container" :class="gridColumnsClass" ref="containerRef">
        <!-- Dynamic Team Ships -->
        <div v-for="sideId in sideIds" :key="sideId" class="team-column">
            <div class="team-header">
                {{ getSideName(sideId) }} {{ t('ships') }}
            </div>

            <div class="attacker-list">
                <div v-if="sortedTeamManifests[sideId] && sortedTeamManifests[sideId].length > 0">
                    <!-- Individual Ship Row -->
                    <component v-for="item in sortedTeamManifests[sideId]"
                        :key="`${sideId}-${item.character_id}-${item.ship_type_id}`"
                        :is="getItemUrl(item) ? 'a' : 'div'" :href="getItemUrl(item)"
                        :class="['attacker-row', { 'lost-ship-row': item.was_lost }]"
                        @click="(e: MouseEvent) => handleRowClick(item, e)">
                        <!-- Top section - images and names -->
                        <div class="attacker-top">
                            <!-- Character Portrait -->
                            <div class="portrait-container">
                                <Image v-if="item.character_id" :type="'character'" :id="item.character_id" :size="64"
                                    class="portrait character-portrait"
                                    :style="{ maxWidth: '64px', maxHeight: '64px' }" />
                                <div v-else class="portrait character-portrait-placeholder"></div>
                            </div>

                            <!-- Corp/Alliance Stacked -->
                            <div class="corp-alliance-container">
                                <Image v-if="item.corporation_id" :type="'corporation'" :id="item.corporation_id"
                                    :size="32" class="portrait corporation-portrait"
                                    :style="{ maxWidth: '32px', maxHeight: '32px' }" />
                                <Image v-if="item.alliance_id" :type="'alliance'" :id="item.alliance_id" :size="32"
                                    class="portrait alliance-portrait"
                                    :style="{ maxWidth: '32px', maxHeight: '32px' }" />
                            </div>

                            <!-- Ship Image -->
                            <div class="ship-container">
                                <Image :type="'type-render'" :id="item.ship_type_id" :size="64" class="ship-image"
                                    :style="{ maxWidth: '64px', maxHeight: '64px' }" />
                            </div>

                            <!-- Name Information -->
                            <div class="name-container">
                                <!-- Character Name -->
                                <div class="entity-name character-name" :class="{ 'lost-character': item.was_lost }">
                                    {{ item.character_name || 'Unknown Pilot' }}
                                </div>

                                <!-- Corporation Name -->
                                <div class="entity-name corporation-name">
                                    {{ item.corporation_name || 'Unknown Corporation' }}
                                </div>

                                <!-- Alliance Name -->
                                <div v-if="item.alliance_name" class="entity-name alliance-name">
                                    {{ item.alliance_name }}
                                </div>
                            </div>
                        </div>

                        <!-- Bottom section - ship name and damage -->
                        <div class="attacker-bottom">
                            <div class="ship-name-container" :class="{ 'lost-ship': item.was_lost }">
                                {{ getLocalizedString(item.ship_name, locale) || 'Unknown Ship' }}
                                <span class="ship-group">
                                    ({{ getLocalizedString(item.ship_group_name, locale) || 'Unknown Group' }})
                                </span>
                            </div>

                            <div class="damage-container">
                                <div class="damage-item damage-taken">
                                    <span class="damage-label">{{ t('damageTaken') }}:</span>
                                    <span class="damage-value">{{ formatNumberWithLocale(item.damage_taken || 0)
                                    }}</span>
                                </div>
                                <div class="damage-item damage-dealt">
                                    <span class="damage-label">{{ t('damageDealt') }}:</span>
                                    <span class="damage-value">{{ formatNumberWithLocale(item.damage_dealt || 0)
                                    }}</span>
                                </div>
                            </div>
                        </div>
                    </component>
                </div>
                <div v-else class="empty-state">
                    No ship data available for this team.
                </div>
            </div>
        </div>

        <!-- No ships message if no manifests -->
        <div v-if="!hasAnyManifests" class="no-ships-message">
            No ship data available for this battle.
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Define the structure for a ship manifest entry
interface ICharacterShipManifestEntry {
    character_id?: number;
    character_name?: string;
    corporation_id?: number;
    corporation_name?: string;
    alliance_id?: number;
    alliance_name?: string;
    ship_type_id: number;
    ship_name: any;
    ship_group_id?: number;
    ship_group_name?: any;
    was_lost: boolean;
    killmail_id_if_lost?: number;
    damage_taken?: number;
    damage_dealt?: number;
}

// Updated interface for dynamic team battle data
interface IBattle {
    side_ids: string[];
    sides: Record<string, {
        name: string;
        ship_manifest?: ICharacterShipManifestEntry[];
    }>;
}

const props = defineProps<{
    battle: IBattle;
}>();

const { locale } = useI18n();
const router = useRouter();

const containerRef = ref<HTMLElement | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);

// Extract side IDs from the battle data
const sideIds = computed(() => props.battle?.side_ids || []);

// Determine grid columns based on number of sides
const gridColumnsClass = computed(() => {
    const count = sideIds.value.length;
    if (count === 0) return '';
    if (count === 1) return 'single-column';
    if (count === 2) return 'two-columns';
    if (count === 3) return 'three-columns';
    return 'four-columns'; // For 4 teams
});

// Function to observe size changes directly on the component's container
const setupResizeObserver = () => {
    if (!containerRef.value || typeof ResizeObserver === 'undefined') return;

    // Clean up existing observer if any
    if (resizeObserver.value) {
        resizeObserver.value.disconnect();
    }

    // Create new observer
    resizeObserver.value = new ResizeObserver(() => {
        // Just keep the observer to ensure the component gets sized within container
    });

    // Start observing the container element
    resizeObserver.value.observe(containerRef.value);
};

// Lifecycle hooks
onMounted(() => {
    // Setup ResizeObserver after a short delay to ensure DOM is ready
    nextTick(() => {
        setupResizeObserver();
    });
});

// Clean up on unmount
onUnmounted(() => {
    if (resizeObserver.value) {
        resizeObserver.value.disconnect();
        resizeObserver.value = null;
    }
});

// Get side name by ID
const getSideName = (sideId: string): string => {
    return props.battle?.sides?.[sideId]?.name || sideId;
};

// Process ship manifests for all teams, always sort by damage dealt descending
const sortedTeamManifests = computed(() => {
    const result: Record<string, ICharacterShipManifestEntry[]> = {};

    for (const sideId of sideIds.value) {
        const manifest = props.battle?.sides?.[sideId]?.ship_manifest || [];

        // Always sort by damage dealt (descending)
        result[sideId] = [...manifest].sort((a, b) => {
            // First by damage dealt (highest first)
            const damageA = a.damage_dealt || 0;
            const damageB = b.damage_dealt || 0;
            return damageB - damageA;
        });
    }

    return result;
});

// Check if any team has manifests
const hasAnyManifests = computed(() => {
    return Object.values(sortedTeamManifests.value).some(manifest => manifest.length > 0);
});

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

// Format numbers with locale
function formatNumberWithLocale(n: number): string {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(locale.value, { maximumFractionDigits: 0 });
}

// Get URL for an item - mirroring the Table component's pattern
function getItemUrl(item: ICharacterShipManifestEntry): string | null {
    if (item.was_lost && item.killmail_id_if_lost) {
        return `/kill/${item.killmail_id_if_lost}`;
    }
    if (item.character_id) {
        return `/character/${item.character_id}`;
    }
    if (item.ship_type_id) {
        return `/item/${item.ship_type_id}`;
    }
    return null;
}

// Handle click event similar to the Table component
function handleRowClick(item: ICharacterShipManifestEntry, event: MouseEvent) {
    // Skip native link handling for elements that are actual links themselves
    if (
        event.target instanceof HTMLAnchorElement ||
        (event.target as Element).closest('a')
    ) {
        return;
    }

    const url = getItemUrl(item);
    if (!url) return;

    // Prevent default only for non-anchor elements to avoid conflicts
    if (!(event.currentTarget instanceof HTMLAnchorElement)) {
        event.preventDefault();
    }

    // Handle Ctrl/Cmd + click to open in new tab
    if (event.ctrlKey || event.metaKey) {
        window.open(url, '_blank');
    } else {
        router.push(url);
    }
}
</script>

<style scoped>
.battle-overview-container {
    margin-top: var(--space-4);
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
}

/* Grid Layout Classes */
.single-column {
    grid-template-columns: 1fr;
}

.two-columns {
    grid-template-columns: 1fr;
}

@media (min-width: 1280px) {
    .two-columns {
        grid-template-columns: repeat(2, 1fr);
    }
}

.three-columns {
    grid-template-columns: 1fr;
}

@media (min-width: 1280px) {
    .three-columns {
        grid-template-columns: repeat(3, 1fr);
    }
}

.four-columns {
    grid-template-columns: 1fr;
}

@media (min-width: 1280px) {
    .four-columns {
        grid-template-columns: repeat(4, 1fr);
    }
}

/* Team column sizing */
.team-column {
    min-width: 0;
}

.team-header {
    margin-bottom: var(--space-2);
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
    color: var(--color-text-primary);
}

/* Attacker List Styling */
.attacker-list {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    box-shadow: var(--shadow-lg);
    border-radius: var(--radius-lg);
    overflow: hidden;
}

/* Attacker row styling */
.attacker-row {
    padding: var(--space-3);
    border-bottom: 1px solid var(--color-border);
    transition: background-color var(--duration-fast);
    color: inherit;
    text-decoration: none;
    display: block;
}

/* When the row is an anchor tag, add hover styles */
a.attacker-row {
    cursor: pointer;
}

a.attacker-row:hover {
    background: var(--color-surface-hover);
}

.lost-ship-row {
    background: var(--color-danger-surface);
}

a.lost-ship-row:hover {
    background: var(--color-danger-surface-hover);
}

/* Top section - images and names */
.attacker-top {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
}

.portrait-container {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.portrait {
    border-radius: 50%;
    background: var(--color-surface-secondary);
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
}

.character-portrait {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    flex-grow: 0;
}

.character-portrait-placeholder {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--color-surface-secondary);
    border: 1px dashed var(--color-border);
}

.corp-alliance-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 64px;
    flex-shrink: 0;
    width: 32px;
}

.corporation-portrait,
.alliance-portrait {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    flex-grow: 0;
}

.ship-container {
    flex-shrink: 0;
    margin-left: var(--space-1);
    margin-right: var(--space-3);
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ship-image {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-sm);
    background: var(--color-surface-secondary);
    border: 1px solid var(--color-border);
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
}

.name-container {
    min-width: 0;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.entity-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
}

.character-name {
    font-weight: var(--font-semibold);
    font-size: var(--text-base);
    color: var(--color-text-primary);
}

.lost-character {
    color: var(--color-danger) !important;
}

.corporation-name {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
}

.alliance-name {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
}

/* Bottom section - ship name and damage */
.attacker-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border-light);
}

.ship-name-container {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-text-secondary);
    flex-grow: 1;
    min-width: 0;
}

.lost-ship {
    color: var(--color-danger) !important;
}

.ship-group {
    color: var(--color-text-tertiary);
    font-weight: var(--font-normal);
    margin-left: var(--space-1);
}

.damage-container {
    display: flex;
    gap: var(--space-4);
    font-size: var(--text-sm);
    white-space: nowrap;
    flex-shrink: 0;
}

.damage-item {
    display: flex;
    gap: var(--space-1);
    align-items: center;
}

.damage-taken .damage-value {
    color: var(--color-warning);
}

.damage-dealt .damage-value {
    color: var(--color-success);
}

.damage-label {
    font-weight: var(--font-medium);
    color: var(--color-text-tertiary);
}

.damage-value {
    font-weight: var(--font-medium);
}

/* Empty state styling */
.empty-state {
    padding: var(--space-6);
    text-align: center;
    color: var(--color-text-tertiary);
    font-style: italic;
}

.no-ships-message {
    grid-column: 1 / -1;
    text-align: center;
    padding: var(--space-8) 0;
    color: var(--color-text-tertiary);
}

/* Responsive adjustments for team columns */
@media (max-width: 1200px) {

    .two-columns,
    .three-columns,
    .four-columns {
        grid-template-columns: repeat(2, 1fr);
    }

    .attacker-top {
        flex-wrap: wrap;
    }

    .name-container {
        flex-basis: 100%;
        margin-top: var(--space-2);
    }
}

@media (max-width: 768px) {

    .two-columns,
    .three-columns,
    .four-columns {
        grid-template-columns: 1fr;
    }

    .attacker-bottom {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-2);
    }

    .damage-container {
        align-self: flex-end;
    }
}
</style>
