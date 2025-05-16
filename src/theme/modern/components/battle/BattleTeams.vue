<template>
    <div class="grid grid-cols-1 gap-4" :class="{
        'md:grid-cols-2': sideIds.length <= 2,
        'md:grid-cols-3': sideIds.length === 3,
        'md:grid-cols-4': sideIds.length >= 4
    }">
        <!-- Dynamic team rendering -->
        <div v-for="sideId in sideIds" :key="sideId" class="team-column">
            <div class="bg-background-800 p-4 rounded-lg shadow-lg">
                <div class="team-header">
                    <h2 class="text-lg font-semibold">{{ getSideName(sideId) }}</h2>
                </div>

                <!-- Enhanced stats section styled like KillInformationBox -->
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">ISK Lost:</span>
                        <span class="stat-value">{{ formatIsk(teamStats[sideId]?.iskLost || 0) }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Ships Lost:</span>
                        <span class="stat-value">{{ teamStats[sideId]?.shipsLost || 0 }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Damage Inflicted:</span>
                        <span class="stat-value">{{ formatNumberWithLocale(teamStats[sideId]?.damageInflicted || 0)
                        }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Alliances:</span>
                        <span class="stat-value">{{ getAllianceCount(sideId) }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Corporations:</span>
                        <span class="stat-value">{{ getCorpCount(sideId) }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Characters:</span>
                        <span class="stat-value">{{ getCharacterCount(sideId) }}</span>
                    </div>
                </div>

                <div class="organizations-section">
                    <h3 class="section-title text-black dark:text-white mb-2">
                        Organizations
                    </h3>
                    <div class="organizations-content">
                        <!-- Alliances with corporations -->
                        <div v-for="alliance in teamAlliances[sideId] || []" :key="`${sideId}-alliance-${alliance.id}`"
                            class="alliance-group">
                            <div class="alliance-header" @click="toggleAlliance(`${sideId}-${alliance.id}`)">
                                <div class="alliance-name text-black dark:text-white">
                                    <NuxtLink v-if="alliance.id" :to="`/alliance/${alliance.id}`" class="entity-link">
                                        <Image v-if="alliance.id" :type="'alliance'" :id="alliance.id" :size="24"
                                            clsoass="org-icon" />
                                        <span class="text-black dark:text-white">{{ alliance.name }}</span>
                                        <span class="count">
                                            ({{ getCorpsInAlliance(sideId, alliance.id) }})
                                        </span>
                                    </NuxtLink>
                                    <span v-else>
                                        <span class="text-black dark:text-white">{{ alliance.name }}</span>
                                    </span>
                                </div>
                                <Icon
                                    :name="isAllianceCollapsed(`${sideId}-${alliance.id}`) ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                                    class="toggle-icon text-black dark:text-white" />
                            </div>
                            <div v-if="!isAllianceCollapsed(`${sideId}-${alliance.id}`)" class="corporation-list">
                                <div v-for="corp in getCorpsForAlliance(sideId, alliance.id)"
                                    :key="`${sideId}-corp-${corp.id}`" class="corporation-item">
                                    <NuxtLink v-if="corp.id" :to="`/corporation/${corp.id}`"
                                        class="entity-link corporation-name text-black dark:text-white">
                                        <Image v-if="corp.id" :type="'corporation'" :id="corp.id" :size="24"
                                            class="org-icon" />
                                        <span class="text-black dark:text-white">{{ corp.name }}</span>
                                    </NuxtLink>
                                    <span v-else class="text-black dark:text-white">
                                        <span>{{ corp.name }}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Standalone corporations -->
                        <div v-if="getStandaloneCorpsCount(sideId) > 0" class="no-alliance-section">
                            <div class="no-alliance-header text-black dark:text-white"
                                @click="toggleStandaloneCorps(sideId)">
                                Standalone Corporations ({{ getStandaloneCorpsCount(sideId) }})
                                <Icon
                                    :name="isStandaloneCorpsCollapsed(sideId) ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                                    class="toggle-icon text-black dark:text-white" />
                            </div>
                            <div v-if="!isStandaloneCorpsCollapsed(sideId)" class="corporation-list standalone-list">
                                <div v-for="corp in getStandaloneCorps(sideId)" :key="`${sideId}-standalone-${corp.id}`"
                                    class="corporation-item standalone">
                                    <NuxtLink v-if="corp.id" :to="`/corporation/${corp.id}`"
                                        class="entity-link corporation-name text-black dark:text-white">
                                        <Image v-if="corp.id" :type="'corporation'" :id="corp.id" :size="24"
                                            class="org-icon" />
                                        <span class="text-black dark:text-white">{{ corp.name }}</span>
                                    </NuxtLink>
                                    <span v-else class="text-black dark:text-white">
                                        <span>{{ corp.name }}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

const props = defineProps<{
    previewData: any,
    teamStats: Record<string, any>,
    teamAlliances: Record<string, any[]>,
    teamCorporations: Record<string, any[]>,
    teamCharacters: Record<string, any[]>, // Make this non-optional
}>();

// Get all side IDs from the preview data
const sideIds = computed(() => {
    return props.previewData?.side_ids || [];
});

// Get side name
function getSideName(sideId: string): string {
    return props.previewData?.sides?.[sideId]?.name || sideId;
}

// Alliance collapse state with team prefixing to avoid conflicts between teams
const allianceCollapsedState = ref<Record<string, boolean>>({});
const standaloneCorpsCollapsedState = ref<Record<string, boolean>>({});

// Initialize collapsed states
watch(() => props.teamAlliances, (alliances) => {
    for (const [sideId, allianceArray] of Object.entries(alliances)) {
        for (const alliance of allianceArray) {
            const key = `${sideId}-${alliance.id}`;
            if (!(key in allianceCollapsedState.value)) {
                allianceCollapsedState.value[key] = true;
            }
        }

        // Initialize standalone corps state for each side
        if (!(sideId in standaloneCorpsCollapsedState.value)) {
            standaloneCorpsCollapsedState.value[sideId] = true;
        }
    }
}, { immediate: true, deep: true });

function toggleAlliance(key: string) {
    allianceCollapsedState.value[key] = !allianceCollapsedState.value[key];
}

function toggleStandaloneCorps(sideId: string) {
    standaloneCorpsCollapsedState.value[sideId] = !standaloneCorpsCollapsedState.value[sideId];
}

const isAllianceCollapsed = computed(() => (key: string) => {
    return allianceCollapsedState.value[key] ?? true;
});

const isStandaloneCorpsCollapsed = computed(() => (sideId: string) => {
    return standaloneCorpsCollapsedState.value[sideId] ?? true;
});

// Helper functions for handling corporations
function getCorpsInAlliance(sideId: string, allianceId: number): number {
    return (props.teamCorporations[sideId] || [])
        .filter(corp => corp.alliance_id === allianceId)
        .length;
}

function getCorpsForAlliance(sideId: string, allianceId: number): any[] {
    return (props.teamCorporations[sideId] || [])
        .filter(corp => corp.alliance_id === allianceId);
}

function getStandaloneCorps(sideId: string): any[] {
    return (props.teamCorporations[sideId] || [])
        .filter(corp => !corp.alliance_id);
}

function getStandaloneCorpsCount(sideId: string): number {
    return getStandaloneCorps(sideId).length;
}

// New helper functions for counts
function getAllianceCount(sideId: string): number {
    return (props.teamAlliances[sideId] || []).length;
}

function getCorpCount(sideId: string): number {
    return (props.teamCorporations[sideId] || []).length;
}

function getCharacterCount(sideId: string): number {
    return (props.teamCharacters[sideId] || []).length;
}

// Formatting helpers
function formatNumber(n: number): string {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Add a new locale-specific number formatter
function formatNumberWithLocale(n: number): string {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(locale.value, { maximumFractionDigits: 0 });
}

function formatIsk(isk: number): string {
    if (!isk) return "0";
    if (isk >= 1000000000000) {
        return `${(isk / 1000000000000).toFixed(2)}T`;
    } else if (isk >= 1000000000) {
        return `${(isk / 1000000000).toFixed(2)}B`;
    } else if (isk >= 1000000) {
        return `${(isk / 1000000).toFixed(2)}M`;
    } else if (isk >= 1000) {
        return `${(isk / 1000).toFixed(2)}K`;
    }
    return isk.toFixed(2);
}
</script>

<style scoped>
/* Add CSS classes for team colors */
.team-column:nth-child(1) .team-header h2 {
    color: #3b82f6;
    /* Blue */
}

.team-column:nth-child(2) .team-header h2 {
    color: #ef4444;
    /* Red */
}

.team-column:nth-child(3) .team-header h2 {
    color: #10b981;
    /* Green */
}

.team-column:nth-child(4) .team-header h2 {
    color: #f59e0b;
    /* Yellow */
}

.team-header {
    margin-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.5rem;
    text-align: center;
}

/* New stats grid styling */
.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.4));
}

.stat-item {
    display: flex;
    flex-direction: column;
    padding: 0.25rem;
}

.stat-label {
    font-size: 0.75rem;
    color: light-dark(#6b7280, #9ca3af);
    font-weight: 500;
}

.stat-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: light-dark(#1f2937, #f3f4f6);
}

.organizations-section {
    margin-top: 0.75rem;
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
}

.section-title {
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

/* Alliance styling */
.alliance-group {
    margin-bottom: 0.75rem;
}

.alliance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background-color: light-dark(rgba(245, 245, 245, 0.15), rgba(38, 38, 38, 0.4));
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.alliance-header:hover {
    background-color: light-dark(rgba(245, 245, 245, 0.25), rgba(45, 45, 45, 0.5));
}

.alliance-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.no-alliance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background-color: light-dark(rgba(245, 245, 245, 0.15), rgba(38, 38, 38, 0.4));
    border-radius: 0.375rem;
    cursor: pointer;
    margin-top: 1rem;
    font-weight: 500;
    transition: background-color 0.2s ease;
}

.no-alliance-header:hover {
    background-color: light-dark(rgba(245, 245, 245, 0.25), rgba(45, 45, 45, 0.5));
}

/* Corporation styling with indentation */
.corporation-list {
    padding: 0.25rem 0;
}

.corporation-item {
    display: flex;
    align-items: center;
    padding: 0.4rem 0.75rem;
    margin: 0.25rem 0;
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.2));
    border-radius: 0.25rem;
    margin-left: 1.5rem;
    /* Indentation */
    border-left: 2px solid light-dark(rgba(203, 213, 225, 0.3), rgba(71, 85, 105, 0.3));
}

.corporation-item.standalone {
    margin-left: 0;
    /* No indentation for standalone corps */
}

.corporation-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.org-icon {
    border-radius: 50%;
    flex-shrink: 0;
}

.toggle-icon {
    width: 18px;
    height: 18px;
}

.entity-link {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s ease;
}

.entity-link:hover {
    color: light-dark(#3b82f6, #60a5fa);
    text-decoration: underline;
}

.count {
    font-size: 0.85rem;
    color: light-dark(#6b7280, #9ca3af);
    margin-left: 0.25rem;
}
</style>
