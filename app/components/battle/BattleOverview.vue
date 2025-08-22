<template>
    <div class="mt-4 grid grid-cols-1 gap-4" :class="gridColumnsClass" ref="containerRef">
        <!-- Dynamic Team Ships -->
        <div v-for="sideId in sideIds" :key="sideId" class="team-column">
            <div class="mb-2 text-lg font-bold text-black dark:text-white">
                {{ getSideName(sideId) }} {{ t('ships') }}
            </div>

            <div class="attacker-list bg-background-800 shadow-lg rounded-lg border border-gray-700/30 overflow-hidden">
                <div v-if="sortedTeamManifests[sideId] && sortedTeamManifests[sideId].length > 0">
                    <!-- Individual Ship Row -->
                    <component v-for="item in sortedTeamManifests[sideId]"
                        :key="`${sideId}-${item.character_id}-${item.ship_type_id}`"
                        :is="getItemUrl(item) ? 'a' : 'div'" :href="getItemUrl(item)"
                        :class="['attacker-row', { 'lost-ship-row': item.was_lost }]"
                        @click="(e) => handleRowClick(item, e)">
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
                                <Image :type="'type-overlay-render'" :id="item.ship_type_id" :size="64"
                                    class="ship-image" :style="{ maxWidth: '64px', maxHeight: '64px' }" />
                            </div>

                            <!-- Name Information -->
                            <div class="name-container">
                                <!-- Character Name -->
                                <div class="entity-name character-name"
                                    :class="{ 'text-red-500 dark:text-red-400': item.was_lost }">
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
                            <div class="ship-name-container"
                                :class="{ 'text-red-500 dark:text-red-400': item.was_lost }">
                                {{ getLocalizedString(item.ship_name, locale) || 'Unknown Ship' }}
                                <span class="ship-group">
                                    ({{ getLocalizedString(item.ship_group_name, locale) || 'Unknown Group' }})
                                </span>
                            </div>

                            <div class="damage-container">
                                <div class="damage-item damage-taken">
                                    <span class="damage-label">{{ t('damageTaken') }}:</span>
                                    {{ formatNumberWithLocale(item.damage_taken || 0) }}
                                </div>
                                <div class="damage-item damage-dealt">
                                    <span class="damage-label">{{ t('damageDealt') }}:</span>
                                    {{ formatNumberWithLocale(item.damage_dealt || 0) }}
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
        <div v-if="!hasAnyManifests" class="col-span-full text-center py-8 text-gray-500">
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
    if (count === 1) return 'md:grid-cols-1';
    if (count === 2) return 'xl:grid-cols-2';
    if (count === 3) return 'xl:grid-cols-3';
    return 'xl:grid-cols-4'; // For 4 teams
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
    // Convert localeKey from 'en-US' to 'en' if necessary
    const lang = localeKey.split('-')[0];
    return obj[lang] || obj.en || (typeof obj === 'string' ? obj : "");
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
/* Team column sizing */
.team-column {
    min-width: 0;
    /* Allow columns to shrink */
}

/* Attacker List Styling */
.attacker-list {
    border: 1px solid rgba(75, 85, 99, 0.2);
    background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.4));
}

/* Make attacker-row act like a link when it actually is a link */
.attacker-row {
    padding: 0.75rem;
    border-bottom: 1px solid rgba(75, 85, 99, 0.2);
    transition: background-color 0.15s ease;
    color: inherit;
    text-decoration: none;
    display: block;
}

/* When the row is an anchor tag, add hover styles */
a.attacker-row {
    cursor: pointer;
}

a.attacker-row:hover {
    background-color: light-dark(rgba(243, 244, 246, 0.7), rgba(31, 41, 55, 0.7));
}

.lost-ship-row {
    background-color: light-dark(rgba(254, 226, 226, 0.4), rgba(127, 29, 29, 0.1));
}

a.lost-ship-row:hover {
    background-color: light-dark(rgba(254, 226, 226, 0.6), rgba(127, 29, 29, 0.2));
}

/* Top section - images and names */
.attacker-top {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
}

.portrait-container {
    flex-shrink: 0;
    width: 64px;
    /* Fixed width */
    height: 64px;
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
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    /* Prevent flexbox from shrinking the image */
    flex-grow: 0;
    /* Prevent flexbox from growing the image */
}

.character-portrait-placeholder {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background-color: rgba(100, 100, 100, 0.1);
    border: 1px dashed rgba(128, 128, 128, 0.3);
}

.corp-alliance-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 64px;
    flex-shrink: 0;
    width: 32px;
    /* Fixed width container */
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
    margin-left: 0.25rem;
    margin-right: 0.75rem;
    width: 64px;
    /* Fixed width */
    height: 64px;
    /* Fixed height */
    display: flex;
    align-items: center;
    justify-content: center;
}

.ship-image {
    width: 64px;
    height: 64px;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(75, 85, 99, 0.2);
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
}

.name-container {
    min-width: 0;
    /* Allow text to shrink */
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
    font-weight: 600;
    font-size: 1rem;
    color: light-dark(#111827, #f3f4f6);
}

.corporation-name {
    font-size: 0.875rem;
    color: light-dark(#4b5563, #d1d5db);
}

.alliance-name {
    font-size: 0.75rem;
    color: light-dark(#6b7280, #9ca3af);
}

/* Bottom section - ship name and damage */
.attacker-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(75, 85, 99, 0.1);
}

.ship-name-container {
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: light-dark(#374151, #e5e7eb);
    flex-grow: 1;
    min-width: 0;
    /* Allow text to shrink */
}

.ship-group {
    color: light-dark(#6b7280, #9ca3af);
    font-weight: normal;
    margin-left: 0.25rem;
}

.damage-container {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    white-space: nowrap;
    flex-shrink: 0;
}

.damage-item {
    display: flex;
    gap: 0.25rem;
}

.damage-taken {
    color: #f97316;
    /* orange */
}

.damage-dealt {
    color: #22c55e;
    /* green */
}

.damage-label {
    font-weight: 500;
    color: light-dark(#6b7280, #9ca3af);
}

/* Empty state styling */
.empty-state {
    padding: 1.5rem;
    text-align: center;
    color: light-dark(#6b7280, #9ca3af);
    font-style: italic;
}

/* Text color for lost ships */
.text-red-500 {
    color: #ef4444 !important;
}

.dark .text-red-400 {
    color: #f87171 !important;
}

/* Responsive adjustments for team columns */
@media (max-width: 1200px) {

    .xl\:grid-cols-4,
    .xl\:grid-cols-3 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .attacker-top {
        flex-wrap: wrap;
    }

    .name-container {
        flex-basis: 100%;
        margin-top: 0.5rem;
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

    .damage-container {
        align-self: flex-end;
    }
}
</style>
