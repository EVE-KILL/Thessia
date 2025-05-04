<template>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <!-- Blue Team -->
        <div>
            <div class="bg-background-800 p-4 rounded-lg shadow-lg">
                <div class="mb-2 text-sm text-background-400">
                    ISK Lost: {{ formatIsk(blueTeamStats.iskLost) }} ISK | Ships Lost: {{ blueTeamStats.shipsLost }} |
                    Damage Inflicted: {{ formatNumber(blueTeamStats.damageInflicted) }}
                </div>

                <!-- Blue Team Organizations (Collapsible) -->
                <div class="organizations-section">
                    <div class="section-header" @click="toggleBlueTeam">
                        <h3 class="section-title text-black dark:text-white">
                            Blue Team Organizations
                        </h3>
                        <Icon :name="isBlueTeamCollapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                            class="toggle-icon text-black dark:text-white" />
                    </div>

                    <div v-if="!isBlueTeamCollapsed" class="organizations-content">
                        <!-- Alliances with corporations -->
                        <div v-for="alliance in blueTeamAlliances" :key="alliance.id" class="alliance-group">
                            <div class="alliance-header" @click="toggleAlliance(alliance.id)">
                                <div class="alliance-name text-black dark:text-white">
                                    <NuxtLink v-if="alliance.id" :to="`/alliance/${alliance.id}`" class="entity-link">
                                        <Image v-if="alliance.id" :type="'alliance'" :id="alliance.id" :size="24"
                                            class="org-icon" />
                                        <span class="text-black dark:text-white">{{ alliance.name }}</span>
                                        <span class="count">({{blueTeamCorporations.filter(corp => corp.alliance_id ===
                                            alliance.id).length}})</span>
                                    </NuxtLink>
                                    <span v-else>
                                        <span class="text-black dark:text-white">{{ alliance.name }}</span>
                                        <span class="count">({{blueTeamCorporations.filter(corp => corp.alliance_id ===
                                            alliance.id).length}})</span>
                                    </span>
                                </div>
                                <Icon
                                    :name="isAllianceCollapsed(alliance.id) ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                                    class="toggle-icon text-black dark:text-white" />
                            </div>

                            <!-- Corporations in alliance -->
                            <div v-if="!isAllianceCollapsed(alliance.id)" class="corporation-list">
                                <div v-for="corp in blueTeamCorporations.filter(corp => corp.alliance_id === alliance.id)"
                                    :key="corp.id" class="corporation-item">
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

                        <!-- Corporations without alliance -->
                        <div v-if="blueTeamCorporations.filter(corp => !corp.alliance_id).length > 0"
                            class="no-alliance-section">
                            <div class="no-alliance-header text-black dark:text-white" @click="toggleStandaloneCorps">
                                Standalone Corporations ({{blueTeamCorporations.filter(corp =>
                                    !corp.alliance_id).length}})
                                <Icon :name="isStandaloneCorpsCollapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                                    class="toggle-icon text-black dark:text-white" />
                            </div>

                            <div v-if="!isStandaloneCorpsCollapsed" class="corporation-list">
                                <div v-for="corp in blueTeamCorporations.filter(corp => !corp.alliance_id)"
                                    :key="corp.id" class="corporation-item standalone">
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
        <!-- Red Team -->
        <div>
            <div class="bg-background-800 p-4 rounded-lg shadow-lg">
                <div class="mb-2 text-sm text-background-400">
                    ISK Lost: {{ formatIsk(redTeamStats.iskLost) }} ISK | Ships Lost: {{ redTeamStats.shipsLost }} |
                    Damage Inflicted: {{ formatNumber(redTeamStats.damageInflicted) }}
                </div>

                <!-- Red Team Organizations (Collapsible) -->
                <div class="organizations-section">
                    <div class="section-header" @click="toggleRedTeam">
                        <h3 class="section-title text-black dark:text-white">
                            Red Team Organizations
                        </h3>
                        <Icon :name="isRedTeamCollapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                            class="toggle-icon text-black dark:text-white" />
                    </div>

                    <div v-if="!isRedTeamCollapsed" class="organizations-content">
                        <!-- Alliances with corporations -->
                        <div v-for="alliance in redTeamAlliances" :key="alliance.id" class="alliance-group">
                            <div class="alliance-header" @click="toggleAlliance(alliance.id)">
                                <div class="alliance-name text-black dark:text-white">
                                    <NuxtLink v-if="alliance.id" :to="`/alliance/${alliance.id}`" class="entity-link">
                                        <Image v-if="alliance.id" :type="'alliance'" :id="alliance.id" :size="24"
                                            class="org-icon" />
                                        <span class="text-black dark:text-white">{{ alliance.name }}</span>
                                        <span class="count">({{redTeamCorporations.filter(corp => corp.alliance_id
                                            ===
                                            alliance.id).length}})</span>
                                    </NuxtLink>
                                    <span v-else>
                                        <span class="text-black dark:text-white">{{ alliance.name }}</span>
                                        <span class="count">({{redTeamCorporations.filter(corp => corp.alliance_id
                                            ===
                                            alliance.id).length}})</span>
                                    </span>
                                </div>
                                <Icon
                                    :name="isAllianceCollapsed(alliance.id) ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                                    class="toggle-icon text-black dark:text-white" />
                            </div>

                            <!-- Corporations in alliance -->
                            <div v-if="!isAllianceCollapsed(alliance.id)" class="corporation-list">
                                <div v-for="corp in redTeamCorporations.filter(corp => corp.alliance_id === alliance.id)"
                                    :key="corp.id" class="corporation-item">
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

                        <!-- Corporations without alliance -->
                        <div v-if="redTeamCorporations.filter(corp => !corp.alliance_id).length > 0"
                            class="no-alliance-section">
                            <div class="no-alliance-header text-black dark:text-white" @click="toggleStandaloneCorps">
                                Standalone Corporations ({{redTeamCorporations.filter(corp =>
                                    !corp.alliance_id).length
                                }})
                                <Icon :name="isStandaloneCorpsCollapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                                    class="toggle-icon text-black dark:text-white" />
                            </div>

                            <div v-if="!isStandaloneCorpsCollapsed" class="corporation-list">
                                <div v-for="corp in redTeamCorporations.filter(corp => !corp.alliance_id)"
                                    :key="corp.id" class="corporation-item standalone">
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
import { computed, ref } from 'vue'; // Import computed

const props = defineProps<{
    blueTeamStats: { iskLost: number, shipsLost: number, damageInflicted: number },
    redTeamStats: { iskLost: number, shipsLost: number, damageInflicted: number },
    blueTeamAlliances: any[],
    redTeamAlliances: any[],
    blueTeamCorporations: any[],
    redTeamCorporations: any[]
}>();

// State for main collapsible sections
const isBlueTeamCollapsed = ref(false);
const isRedTeamCollapsed = ref(false);

// State for nested collapsible sections (alliances and standalone corps)
const allianceCollapsedState = ref<Record<number, boolean>>({});
const isStandaloneCorpsCollapsed = ref(true);

// Initialize alliance collapsed state
// Use watchEffect or a computed property to update this when alliances change if necessary
// For now, assuming alliances don't change after initial load
props.blueTeamAlliances.forEach(alliance => {
    allianceCollapsedState.value[alliance.id] = true;
});
props.redTeamAlliances.forEach(alliance => {
    allianceCollapsedState.value[alliance.id] = true;
});


// Functions to toggle collapsible sections
function toggleBlueTeam() {
    isBlueTeamCollapsed.value = !isBlueTeamCollapsed.value;
}

function toggleRedTeam() {
    isRedTeamCollapsed.value = !isRedTeamCollapsed.value;
}

function toggleAlliance(allianceId: number) {
    allianceCollapsedState.value[allianceId] = !allianceCollapsedState.value[allianceId];
}

function toggleStandaloneCorps() {
    isStandaloneCorpsCollapsed.value = !isStandaloneCorpsCollapsed.value;
}

// Computed property to check if an alliance is collapsed
const isAllianceCollapsed = computed(() => (allianceId: number) => {
    return allianceCollapsedState.value[allianceId] ?? true; // Default to true if state not found
});


function formatNumber(n: number) {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
</script>

<style scoped>
/* Add any necessary scoped styles here to match the original appearance and KillAttackers.vue organizations section */
.organizations-section {
    margin-top: 0.5rem;
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

.section-header:hover {
    opacity: 0.9;
}

.section-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.toggle-icon {
    width: 18px;
    height: 18px;
    color: light-dark(#6b7280, #9ca3af);
}

.organizations-content {
    margin-top: 0.75rem;
    animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.alliance-group {
    margin-bottom: 1rem;
}

.alliance-name {
    font-weight: 500;
    font-size: 1rem;
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
}

.org-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    margin-right: 0.5rem;
}

.count {
    margin-left: 0.5rem;
    font-size: 0.8rem;
    color: light-dark(#6b7280, #9ca3af);
}

.corporation-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-left: 2rem;
}

.corporation-item {
    font-size: 0.9rem;
    display: flex;
    align-items: center;
}

.corporation-item.standalone {
    margin-left: 0;
}

.entity-link {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s ease;
    display: inline-flex;
    align-items: center;
    min-width: 0;
}

.entity-link:hover {
    color: #4fc3f7;
    text-decoration: underline;
}

.corporation-name {
    display: flex;
    align-items: center;
}

.no-alliance-section {
    margin-top: 1rem;
}

.no-alliance-header {
    font-weight: 500;
    font-size: 1rem;
    margin-bottom: 0.25rem;
    color: light-dark(#6b7280, #9ca3af);
}

.alliance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
}

.alliance-header:hover {
    opacity: 0.9;
}

.grid>div>.bg-background-800 .organizations-section :deep(.table-row:hover) {
    background: light-dark(rgba(229, 231, 235, 0.15), rgba(35, 35, 35, 0.5));
}
</style>
