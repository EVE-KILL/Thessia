<template>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <!-- Blue Team -->
        <div>
            <div class="bg-background-800 p-4 rounded-lg shadow-lg">
                <div class="mb-2 text-sm text-background-400">
                    ISK Lost: {{ formatIsk(blueTeamStats.iskLost) }} ISK | Ships Lost: {{ blueTeamStats.shipsLost }} |
                    Damage Inflicted: {{ formatNumber(blueTeamStats.damageInflicted) }}
                </div>
                <div class="organizations-section">
                    <h3 class="section-title text-black dark:text-white mb-2">
                        Blue Team Organizations
                    </h3>
                    <div class="organizations-content">
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
                <div class="organizations-section">
                    <h3 class="section-title text-black dark:text-white mb-2">
                        Red Team Organizations
                    </h3>
                    <div class="organizations-content">
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
import { computed, ref, watch } from 'vue';

const props = defineProps<{
    blueTeamStats: { iskLost: number, shipsLost: number, damageInflicted: number },
    redTeamStats: { iskLost: number, shipsLost: number, damageInflicted: number },
    blueTeamAlliances: any[],
    redTeamAlliances: any[],
    blueTeamCorporations: any[],
    redTeamCorporations: any[]
}>();

const allianceCollapsedState = ref<Record<number, boolean>>({});
const isStandaloneCorpsCollapsed = ref(true);

// Ensure allianceCollapsedState is initialized reactively when alliances change
watch(
    () => [props.blueTeamAlliances, props.redTeamAlliances],
    ([blueAlliances, redAlliances]) => {
        for (const alliance of blueAlliances) {
            if (!(alliance.id in allianceCollapsedState.value)) {
                allianceCollapsedState.value[alliance.id] = true;
            }
        }
        for (const alliance of redAlliances) {
            if (!(alliance.id in allianceCollapsedState.value)) {
                allianceCollapsedState.value[alliance.id] = true;
            }
        }
    },
    { immediate: true, deep: true }
);

function toggleAlliance(allianceId: number) {
    allianceCollapsedState.value[allianceId] = !allianceCollapsedState.value[allianceId];
}

function toggleStandaloneCorps() {
    isStandaloneCorpsCollapsed.value = !isStandaloneCorpsCollapsed.value;
}

const isAllianceCollapsed = computed(() => (allianceId: number) => {
    return allianceCollapsedState.value[allianceId] ?? true;
});

function formatNumber(n: number) {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
</script>

<style scoped>
.organizations-section {
    margin-top: 0.5rem;
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
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
