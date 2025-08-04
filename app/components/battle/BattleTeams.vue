<template>
    <div class="teams-grid">
        <!-- Dynamic team rendering -->
        <div v-for="sideId in sideIds" :key="sideId" class="team-column">
            <Card>
                <template #header>
                    <h3 class="team-title" :class="`team-${getSideIndex(sideId) + 1}`">
                        {{ getSideName(sideId) }}
                    </h3>
                </template>
                <template #body>
                    <!-- Enhanced stats section -->
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
                        <!-- Make the title clickable to toggle the organizations content -->
                        <h4 class="section-title" @click="toggleOrganizationsSection(sideId)">
                            <span>Organizations</span>
                            <Icon
                                :name="isOrganizationsSectionCollapsed(sideId) ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                                class="toggle-icon" />
                        </h4>

                        <!-- Only show the organizations content when the section is expanded -->
                        <div v-if="!isOrganizationsSectionCollapsed(sideId)" class="organizations-content">
                            <!-- Alliances with corporations -->
                            <div v-for="alliance in teamAlliances[sideId] || []"
                                :key="`${sideId}-alliance-${alliance.id}`" class="alliance-group">
                                <div class="alliance-header" @click="toggleAlliance(`${sideId}-${alliance.id}`)">
                                    <div class="alliance-name">
                                        <NuxtLink v-if="alliance.id" :to="`/alliance/${alliance.id}`"
                                            class="entity-link">
                                            <Image v-if="alliance.id" :type="'alliance'" :id="alliance.id" :size="24"
                                                class="org-icon" />
                                            <span>{{ alliance.name }}</span>
                                            <span class="count">
                                                ({{ getCorpsInAlliance(sideId, alliance.id) }})
                                            </span>
                                        </NuxtLink>
                                        <span v-else>
                                            <span>{{ alliance.name }}</span>
                                        </span>
                                    </div>
                                    <Icon
                                        :name="isAllianceCollapsed(`${sideId}-${alliance.id}`) ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                                        class="toggle-icon" />
                                </div>
                                <div v-if="!isAllianceCollapsed(`${sideId}-${alliance.id}`)" class="corporation-list">
                                    <div v-for="corp in getCorpsForAlliance(sideId, alliance.id)"
                                        :key="`${sideId}-corp-${corp.id}`" class="corporation-item">
                                        <NuxtLink v-if="corp.id" :to="`/corporation/${corp.id}`"
                                            class="entity-link corporation-name">
                                            <Image v-if="corp.id" :type="'corporation'" :id="corp.id" :size="24"
                                                class="org-icon" />
                                            <span>{{ corp.name }}</span>
                                        </NuxtLink>
                                        <span v-else>
                                            <span>{{ corp.name }}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Standalone corporations -->
                            <div v-if="getStandaloneCorpsCount(sideId) > 0" class="no-alliance-section">
                                <div class="no-alliance-header" @click="toggleStandaloneCorps(sideId)">
                                    <span>Standalone Corporations ({{ getStandaloneCorpsCount(sideId) }})</span>
                                    <Icon
                                        :name="isStandaloneCorpsCollapsed(sideId) ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                                        class="toggle-icon" />
                                </div>
                                <div v-if="!isStandaloneCorpsCollapsed(sideId)"
                                    class="corporation-list standalone-list">
                                    <div v-for="corp in getStandaloneCorps(sideId)"
                                        :key="`${sideId}-standalone-${corp.id}`" class="corporation-item standalone">
                                        <NuxtLink v-if="corp.id" :to="`/corporation/${corp.id}`"
                                            class="entity-link corporation-name">
                                            <Image v-if="corp.id" :type="'corporation'" :id="corp.id" :size="24"
                                                class="org-icon" />
                                            <span>{{ corp.name }}</span>
                                        </NuxtLink>
                                        <span v-else>
                                            <span>{{ corp.name }}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </Card>
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
// New state for organizations section collapse
const organizationsSectionCollapsedState = ref<Record<string, boolean>>({});

// Initialize collapsed states
watch(() => props.teamAlliances, (alliances) => {
    for (const [sideId, allianceArray] of Object.entries(alliances)) {
        // Initialize organizations section state - default to collapsed (true)
        if (!(sideId in organizationsSectionCollapsedState.value)) {
            organizationsSectionCollapsedState.value[sideId] = true;
        }

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

// Toggle functions
function toggleAlliance(key: string) {
    allianceCollapsedState.value[key] = !allianceCollapsedState.value[key];
}

function toggleStandaloneCorps(sideId: string) {
    standaloneCorpsCollapsedState.value[sideId] = !standaloneCorpsCollapsedState.value[sideId];
}

// New function to toggle the organizations section
function toggleOrganizationsSection(sideId: string) {
    organizationsSectionCollapsedState.value[sideId] = !organizationsSectionCollapsedState.value[sideId];
}

// Computed state checkers
const isAllianceCollapsed = computed(() => (key: string) => {
    return allianceCollapsedState.value[key] ?? true;
});

const isStandaloneCorpsCollapsed = computed(() => (sideId: string) => {
    return standaloneCorpsCollapsedState.value[sideId] ?? true;
});

// New computed function to check if organizations section is collapsed
const isOrganizationsSectionCollapsed = computed(() => (sideId: string) => {
    return organizationsSectionCollapsedState.value[sideId] ?? true;
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

// Get side index for styling
function getSideIndex(sideId: string): number {
    return sideIds.value.indexOf(sideId);
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
/* Grid Layout */
.teams-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-lg);
}

/* Team Column Responsive Grid */
@media (min-width: 768px) {
    .teams-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 992px) {
    .teams-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (min-width: 1280px) {
    .teams-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}

/* Team Column */
.team-column {
    min-width: 0;
}

/* Team Colors */
.team-title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin: 0;
    text-align: center;
}

.team-1 {
    color: var(--color-info);
}

.team-2 {
    color: var(--color-danger);
}

.team-3 {
    color: var(--color-success);
}

.team-4 {
    color: var(--color-warning);
}

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    background-color: var(--color-background-secondary);
}

.stat-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-xs);
}

.stat-label {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    font-weight: var(--font-medium);
    flex-shrink: 0;
}

.stat-value {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    text-align: right;
}

/* Organizations Section */
.organizations-section {
    margin-top: var(--space-md);
    padding: var(--space-lg);
    border-radius: var(--radius-md);
    background-color: var(--color-background-tertiary);
}

.section-title {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--color-text-primary);
    transition: color var(--duration-fast) ease;
}

.section-title:hover {
    color: var(--color-primary);
}

/* Alliance Styling */
.alliance-group {
    margin-bottom: var(--space-md);
}

.alliance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    background-color: var(--color-background-hover);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color var(--duration-fast) ease;
}

.alliance-header:hover {
    background-color: var(--color-background-active);
}

.alliance-name {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--color-text-primary);
}

.no-alliance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    background-color: var(--color-background-hover);
    border-radius: var(--radius-md);
    cursor: pointer;
    margin-top: var(--space-lg);
    font-weight: var(--font-medium);
    transition: background-color var(--duration-fast) ease;
    color: var(--color-text-primary);
}

.no-alliance-header:hover {
    background-color: var(--color-background-active);
}

/* Corporation Styling */
.corporation-list {
    padding: var(--space-xs) 0;
}

.corporation-item {
    display: flex;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    margin: var(--space-xs) 0;
    background-color: var(--color-background-secondary);
    border-radius: var(--radius-sm);
    margin-left: var(--space-xl);
    border-left: 2px solid var(--color-border);
}

.corporation-item.standalone {
    margin-left: 0;
}

.corporation-name {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--color-text-primary);
}

.org-icon {
    border-radius: 50%;
    flex-shrink: 0;
}

.toggle-icon {
    width: 18px;
    height: 18px;
    color: var(--color-text-secondary);
}

.entity-link {
    color: inherit;
    text-decoration: none;
    transition: color var(--duration-fast) ease;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.entity-link:hover {
    color: var(--color-primary);
    text-decoration: underline;
}

.count {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    margin-left: var(--space-xs);
}
</style>
