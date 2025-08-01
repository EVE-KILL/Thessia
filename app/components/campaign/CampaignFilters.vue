<template>
    <div class="filter-info-container">
        <!-- Timeline First - Single line date range -->
        <div v-if="campaignQuery" class="mb-4">
            <div class="date-range-box">
                <div class="date-content-single">
                    <div class="date-item-unified">
                        <div class="date-icons">
                            <UIcon name="lucide:calendar-range" class="date-icon" />
                        </div>
                        <div class="date-text-unified">
                            {{ formatDate(startDate) }}
                            <UIcon name="lucide:arrow-right" class="date-arrow-inline" />
                            {{ endDate ? formatDate(endDate) : t('campaign.ongoing') }}
                            <span class="date-duration">- {{ t('campaign.duration') }}:
                                {{ formatDuration(getDurationDays()) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filters Content -->
        <div v-if="hasFilters" class="filter-grid">
            <!-- Locations Card -->
            <div v-if="hasLocations" class="filter-card">
                <div class="card-header locations-header">
                    <UIcon name="lucide:map-pin" class="header-icon" />
                    <span>{{ t('campaign.locations') }}</span>
                </div>
                <div class="card-content">
                    <!-- Regions -->
                    <div v-if="filters.regions.length" class="filter-row">
                        <UIcon name="lucide:globe" class="filter-type-icon" />
                        <div class="filter-type-label">{{ t('regions') }}:</div>
                        <div class="filter-values">
                            <span v-for="(region, index) in filters.regions" :key="`region-${index}`"
                                class="filter-tag">
                                {{ region.name }}
                            </span>
                        </div>
                    </div>

                    <!-- Constellations -->
                    <div v-if="filters.constellations.length" class="filter-row">
                        <UIcon name="lucide:constellation" class="filter-type-icon" />
                        <div class="filter-type-label">{{ t('constellations') }}:</div>
                        <div class="filter-values">
                            <span v-for="(constellation, index) in filters.constellations"
                                :key="`constellation-${index}`" class="filter-tag">
                                {{ constellation.name }}
                            </span>
                        </div>
                    </div>

                    <!-- Systems -->
                    <div v-if="filters.systems.length" class="filter-row">
                        <UIcon name="lucide:sun" class="filter-type-icon" />
                        <div class="filter-type-label">{{ t('systems') }}:</div>
                        <div class="filter-values">
                            <span v-for="(system, index) in filters.systems" :key="`system-${index}`"
                                class="filter-tag">
                                {{ system.name }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Attackers Card -->
            <div v-if="hasAttackers" class="filter-card">
                <div class="card-header attackers-header">
                    <UIcon name="lucide:swords" class="header-icon" />
                    <span>{{ t('campaign.attacker_side') }}</span>
                </div>
                <div class="card-content">
                    <!-- Using regular Vue template syntax instead of a component -->
                    <div class="entity-filters">
                        <!-- Attacker Characters -->
                        <div v-if="filters.attackerCharacters.length" class="filter-row">
                            <UIcon name="lucide:user" class="filter-type-icon" />
                            <div class="filter-type-label">{{ t('characters') }}:</div>
                            <div class="filter-values">
                                <span v-for="(char, index) in filters.attackerCharacters"
                                    :key="`attacker-char-${index}`" class="filter-tag">
                                    {{ char.name }}
                                </span>
                            </div>
                        </div>

                        <!-- Attacker Corporations -->
                        <div v-if="filters.attackerCorporations.length" class="filter-row">
                            <UIcon name="lucide:briefcase" class="filter-type-icon" />
                            <div class="filter-type-label">{{ t('corporations') }}:</div>
                            <div class="filter-values">
                                <span v-for="(corp, index) in filters.attackerCorporations"
                                    :key="`attacker-corp-${index}`" class="filter-tag">
                                    {{ corp.name }}
                                </span>
                            </div>
                        </div>

                        <!-- Attacker Alliances -->
                        <div v-if="filters.attackerAlliances.length" class="filter-row">
                            <UIcon name="lucide:shield" class="filter-type-icon" />
                            <div class="filter-type-label">{{ t('alliances') }}:</div>
                            <div class="filter-values">
                                <span v-for="(alliance, index) in filters.attackerAlliances"
                                    :key="`attacker-alliance-${index}`" class="filter-tag">
                                    {{ alliance.name }}
                                </span>
                            </div>
                        </div>

                        <!-- Attacker Factions -->
                        <div v-if="filters.attackerFactions.length" class="filter-row">
                            <UIcon name="lucide:flag" class="filter-type-icon" />
                            <div class="filter-type-label">{{ t('factions') }}:</div>
                            <div class="filter-values">
                                <span v-for="(faction, index) in filters.attackerFactions"
                                    :key="`attacker-faction-${index}`" class="filter-tag">
                                    {{ faction.name }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Victims Card -->
            <div v-if="hasVictims" class="filter-card">
                <div class="card-header victims-header">
                    <UIcon name="lucide:skull" class="header-icon" />
                    <span>{{ t('campaign.victim_side') }}</span>
                </div>
                <div class="card-content">
                    <!-- Using regular Vue template syntax instead of a component -->
                    <div class="entity-filters">
                        <!-- Victim Characters -->
                        <div v-if="filters.victimCharacters.length" class="filter-row">
                            <UIcon name="lucide:user" class="filter-type-icon" />
                            <div class="filter-type-label">{{ t('characters') }}:</div>
                            <div class="filter-values">
                                <span v-for="(char, index) in filters.victimCharacters" :key="`victim-char-${index}`"
                                    class="filter-tag">
                                    {{ char.name }}
                                </span>
                            </div>
                        </div>

                        <!-- Victim Corporations -->
                        <div v-if="filters.victimCorporations.length" class="filter-row">
                            <UIcon name="lucide:briefcase" class="filter-type-icon" />
                            <div class="filter-type-label">{{ t('corporations') }}:</div>
                            <div class="filter-values">
                                <span v-for="(corp, index) in filters.victimCorporations" :key="`victim-corp-${index}`"
                                    class="filter-tag">
                                    {{ corp.name }}
                                </span>
                            </div>
                        </div>

                        <!-- Victim Alliances -->
                        <div v-if="filters.victimAlliances.length" class="filter-row">
                            <UIcon name="lucide:shield" class="filter-type-icon" />
                            <div class="filter-type-label">{{ t('alliances') }}:</div>
                            <div class="filter-values">
                                <span v-for="(alliance, index) in filters.victimAlliances"
                                    :key="`victim-alliance-${index}`" class="filter-tag">
                                    {{ alliance.name }}
                                </span>
                            </div>
                        </div>

                        <!-- Victim Factions -->
                        <div v-if="filters.victimFactions.length" class="filter-row">
                            <UIcon name="lucide:flag" class="filter-type-icon" />
                            <div class="filter-type-label">{{ t('factions') }}:</div>
                            <div class="filter-values">
                                <span v-for="(faction, index) in filters.victimFactions"
                                    :key="`victim-faction-${index}`" class="filter-tag">
                                    {{ faction.name }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="no-filters">
            <UIcon name="lucide:filter-x" class="no-filters-icon" />
            {{ t('campaign.no_location_or_entity_filters') }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

// Props
const props = defineProps({
    campaignId: { type: String, required: true },
    campaignQuery: { type: Object, default: null },
    filterEntities: {
        type: Object as () => ICampaignFilterEntities | null,
        default: null
    }
});

// Composables
const { t } = useI18n();

// State
const isLoading = ref(true);
const startDate = ref<Date | null>(null);
const endDate = ref<Date | null>(null);
const filters = ref<ICampaignFilterEntities>({
    regions: [],
    constellations: [],
    systems: [],
    attackerCharacters: [],
    attackerCorporations: [],
    attackerAlliances: [],
    attackerFactions: [],
    victimCharacters: [],
    victimCorporations: [],
    victimAlliances: [],
    victimFactions: [],
});

// Format a date for display
const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

// Calculate duration in days
const getDurationDays = (): number => {
    if (!startDate.value) return 0;

    const end = endDate.value || new Date();
    const start = new Date(startDate.value);

    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Format duration in a human-readable format
const formatDuration = (days: number): string => {
    if (days < 7) {
        return t('campaign.days_count', { count: days });
    } else if (days < 30) {
        const weeks = Math.floor(days / 7);
        return t('campaign.weeks_count', { count: weeks });
    } else if (days < 365) {
        const months = Math.floor(days / 30);
        return t('campaign.months_count', { count: months });
    } else {
        const years = Math.floor(days / 365);
        return t('campaign.years_count', { count: years });
    }
};

// Check if sections should be displayed
const hasLocations = computed(() => {
    return filters.value.regions.length > 0 ||
        filters.value.constellations.length > 0 ||
        filters.value.systems.length > 0;
});

const hasAttackers = computed(() => {
    return filters.value.attackerCharacters.length > 0 ||
        filters.value.attackerCorporations.length > 0 ||
        filters.value.attackerAlliances.length > 0 ||
        filters.value.attackerFactions.length > 0;
});

const hasVictims = computed(() => {
    return filters.value.victimCharacters.length > 0 ||
        filters.value.victimCorporations.length > 0 ||
        filters.value.victimAlliances.length > 0 ||
        filters.value.victimFactions.length > 0;
});

const hasFilters = computed(() => {
    return hasLocations.value || hasAttackers.value || hasVictims.value;
});

// Use pre-processed entity data if available
watch(() => props.filterEntities, (newFilterEntities) => {
    if (newFilterEntities) {
        filters.value = { ...newFilterEntities };
        isLoading.value = false;
    }
}, { immediate: true });

// Process campaign query when it's available
watch(() => props.campaignQuery, (newQuery) => {
    if (newQuery) {
        // Extract date range from the query if available
        if (newQuery.kill_time) {
            if (newQuery.kill_time.$gte) {
                startDate.value = new Date(newQuery.kill_time.$gte);
            }
            if (newQuery.kill_time.$lte) {
                endDate.value = new Date(newQuery.kill_time.$lte);
            }
        }

        // If filterEntities not provided, we need to fetch them
        if (!props.filterEntities) {
            fetchFilters();
        } else {
            isLoading.value = false;
        }
    }
}, { immediate: true });

// Only needed as fallback if filterEntities wasn't provided
const fetchFilters = async () => {
    try {
        isLoading.value = true;
        const campaignData = await $fetch(`/api/campaign/${props.campaignId}`);

        if (campaignData) {
            // Extract date range
            if (campaignData.startTime) {
                startDate.value = new Date(campaignData.startTime);
            }
            if (campaignData.endTime) {
                endDate.value = new Date(campaignData.endTime);
            }

            // If we have pre-processed filter entities, use them
            if (campaignData.filterEntities) {
                filters.value = { ...campaignData.filterEntities };
            }
        }
    } catch (error) {
        console.error('Error fetching campaign filters:', error);
    } finally {
        isLoading.value = false;
    }
};

// Lifecycle hooks
onMounted(() => {
    // Only fetch filters if we don't have filterEntities from props
    if (!props.filterEntities && !props.campaignQuery) {
        fetchFilters();
    }
});
</script>

<style scoped>
.filter-info-container {
    background-color: var(--background-800);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    margin-bottom: 1.5rem;
}

.filter-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1rem;
}

/* Updated single line date range styling */
.date-content-single {
    padding: 0.75rem 1rem;
}

.date-item-unified {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background-color: var(--background-700);
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    width: 100%;
}

.date-icons {
    display: flex;
    align-items: center;
    color: var(--primary);
}

.date-text-unified {
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
}

.date-range-label {
    font-weight: 600;
    margin-right: 0.5rem;
}

.date-arrow-inline {
    width: 1rem;
    height: 1rem;
    display: inline-block;
    vertical-align: middle;
    margin: 0 0.25rem;
    color: var(--gray-400);
}

.date-duration {
    margin-left: 1rem;
    color: #3b82f6;
    /* blue color for duration */
    font-weight: 500;
}

@media (max-width: 640px) {
    .date-text-unified {
        white-space: normal;
        overflow: visible;
    }

    .date-duration {
        display: block;
        margin-left: 0;
        margin-top: 0.25rem;
    }
}

/* Filter Cards Grid */
.filter-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
}

@media (min-width: 768px) {
    .filter-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

/* Filter Card Styling */
.filter-card {
    border: 1px solid rgba(55, 65, 81, 0.3);
    border-radius: 0.375rem;
    overflow: hidden;
}

.card-header {
    padding: 0.5rem 1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: var(--background-700);
    font-size: 0.875rem;
}

.header-icon {
    width: 1rem;
    height: 1rem;
}

.locations-header {
    color: #8b5cf6;
    /* Purple for locations */
}

.locations-header .header-icon {
    color: #8b5cf6;
}

.attackers-header {
    color: #10b981;
    /* Green for attackers */
}

.attackers-header .header-icon {
    color: #10b981;
}

.victims-header {
    color: #ef4444;
    /* Red for victims */
}

.victims-header .header-icon {
    color: #ef4444;
}

.card-content {
    padding: 0.75rem;
}

/* Filter Item Styling */
.filter-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    align-items: flex-start;
}

.filter-row:last-child {
    margin-bottom: 0;
}

.filter-type-icon {
    width: 0.875rem;
    height: 0.875rem;
    margin-top: 0.25rem;
    flex-shrink: 0;
    color: var(--gray-400);
}

.filter-type-label {
    font-weight: 500;
    white-space: nowrap;
    font-size: 0.875rem;
}

.filter-values {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    flex: 1;
}

.filter-tag {
    background-color: var(--background-700);
    border-radius: 0.25rem;
    padding: 0.125rem 0.375rem;
    font-size: 0.75rem;
}

/* Empty state styling */
.no-filters {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 0;
    color: var(--gray-400);
    font-style: italic;
    gap: 0.5rem;
}

.no-filters-icon {
    width: 2rem;
    height: 2rem;
    opacity: 0.5;
}
</style>
