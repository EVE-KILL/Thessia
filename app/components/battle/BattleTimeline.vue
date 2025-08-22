<template>
    <div class="timeline-wrapper">
        <div class="timeline-container">
            <!-- Timeline Line -->
            <div class="timeline-line">
                <!-- Start Time -->
                <div class="timeline-marker start-marker">
                    {{ formatShortTime(timelineStart) }}
                    <div class="timeline-date">{{ formatDateOnly(timelineStart) }}</div>
                </div>

                <!-- End Time -->
                <div class="timeline-marker end-marker">
                    {{ formatShortTime(timelineEnd) }}
                    <div class="timeline-date">{{ formatDateOnly(timelineEnd) }}</div>
                </div>

                <!-- Time Markers -->
                <div v-for="(marker, index) in timeMarkers" :key="`marker-${index}`" class="timeline-marker time-marker"
                    :style="{ top: `${marker.position}%` }">
                    {{ marker.label }}
                </div>
            </div>

            <!-- Kill Groups Container -->
            <div class="time-groups-container">
                <!-- Empty message if no kills -->
                <div v-if="groupedKillmails.length === 0" class="no-kills">
                    No killmails found for this battle
                </div>

                <!-- Time Groups -->
                <div v-for="(timeGroup, timeIndex) in groupedKillmails" :key="`time-${timeIndex}`" class="time-group">

                    <!-- Time Label -->
                    <div class="time-group-label">
                        {{ formatTimeOnly(new Date(timeGroup.timestamp).toISOString()) }}
                    </div>

                    <!-- Kills Grid -->
                    <div class="kills-grid" :class="getColumnsClass(battle?.side_ids?.length || 0)">
                        <!-- Column for each team -->
                        <div v-for="sideId in battle?.side_ids || []" :key="`col-${sideId}`" class="team-column"
                            :class="`team-${sideId}`">

                            <!-- Kills for this team in this time group -->
                            <div v-for="(kill, killIndex) in getTeamKills(timeGroup.kills, sideId)"
                                :key="`kill-${kill.killmail_id}-${killIndex}`" class="kill-card"
                                :class="`team-${sideId}`">

                                <!-- Kill Card Content -->
                                <NuxtLink :to="`/kill/${kill.killmail_id}`" class="kill-card-link">
                                    <!-- Victim Info -->
                                    <div class="kill-victim">
                                        <Image v-if="kill.victim?.character_id" :type="'character'"
                                            :id="kill.victim.character_id" :size="24" class="victim-portrait" />
                                        <div class="victim-details">
                                            <div class="victim-name">{{ kill.victim?.character_name || 'Unknown' }}
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Ship Info -->
                                    <div class="kill-ship">
                                        <Image :type="'type-overlay-render'" :id="kill.victim.ship_id" :size="20"
                                            class="ship-image" />
                                        <div class="ship-name">{{
                                            getShortShipName(getLocalizedString(kill.victim.ship_name, locale)) }}</div>
                                        <div class="kill-value">{{ formatIsk(kill.total_value || 0) }}</div>
                                    </div>
                                </NuxtLink>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface KillmailVictim {
    ship_id: number | string;
    ship_name: any;
    ship_group_name?: any;
    character_id?: number;
    character_name?: string;
    corporation_id?: number;
    corporation_name?: string;
    alliance_id?: number;
    alliance_name?: string;
    damage_taken?: number;
}

interface KillmailAttacker {
    character_id?: number;
    character_name?: string;
    corporation_id?: number;
    corporation_name?: string;
    alliance_id?: number;
    alliance_name?: string;
    ship_id?: number;
    final_blow?: boolean;
    damage_done?: number;
}

interface KillmailItem {
    killmail_id: number | string;
    kill_time: string;
    victim: KillmailVictim;
    attackers?: KillmailAttacker[];
    total_value?: number;
}

interface TimeGroup {
    timestamp: number;
    kills: KillmailItem[];
}

const props = defineProps<{
    killmails: KillmailItem[],
    battle: any
}>();

const { locale } = useI18n();

// Sort killmails by time
const sortedKillmails = computed(() => {
    if (!Array.isArray(props.killmails)) return [];
    return [...props.killmails].sort((a, b) =>
        new Date(a.kill_time).getTime() - new Date(b.kill_time).getTime()
    );
});

// Group killmails with better spacing
const groupedKillmails = computed((): TimeGroup[] => {
    if (!sortedKillmails.value.length) return [];

    // Adjust these values to control timeline spacing
    const MIN_GROUP_SPACING_MS = 2 * 60 * 1000; // 2 minutes minimum between groups
    const TIME_TOLERANCE_MS = 2 * 60 * 1000;    // Group kills within 2 minute windows

    const groups: TimeGroup[] = [];

    for (const kill of sortedKillmails.value) {
        const killTime = new Date(kill.kill_time).getTime();

        // Find an existing group that this kill can fit into
        let foundGroup = false;
        for (const group of groups) {
            if (Math.abs(killTime - group.timestamp) <= TIME_TOLERANCE_MS) {
                group.kills.push(kill);
                foundGroup = true;
                break;
            }
        }

        // If no suitable group found, create a new one
        if (!foundGroup) {
            // Check if new group would be too close to any existing group
            let tooClose = false;
            for (const group of groups) {
                if (Math.abs(killTime - group.timestamp) <= MIN_GROUP_SPACING_MS) {
                    tooClose = true;
                    // Add to closest group instead
                    group.kills.push(kill);
                    break;
                }
            }

            // Create a new group if not too close
            if (!tooClose) {
                groups.push({
                    timestamp: killTime,
                    kills: [kill]
                });
            }
        }
    }

    // Sort groups by timestamp
    return groups.sort((a, b) => a.timestamp - b.timestamp);
});

// Get timeline start and end times
const timelineStart = computed(() => {
    if (!props.battle) return new Date().toISOString();
    return props.battle.start_time ||
        (sortedKillmails.value.length ? sortedKillmails.value[0].kill_time : new Date().toISOString());
});

const timelineEnd = computed(() => {
    if (!props.battle) return new Date().toISOString();
    return props.battle.end_time ||
        (sortedKillmails.value.length ?
            sortedKillmails.value[sortedKillmails.value.length - 1].kill_time :
            new Date().toISOString());
});

// Generate intermediate time markers
const timeMarkers = computed(() => {
    const startTime = new Date(timelineStart.value).getTime();
    const endTime = new Date(timelineEnd.value).getTime();
    const duration = endTime - startTime;

    // Create evenly spaced markers (reduced number for cleaner look)
    const markers = [];
    const maxMarkers = 3;

    for (let i = 1; i <= maxMarkers; i++) {
        const position = (i * 100) / (maxMarkers + 1);
        const time = new Date(startTime + (duration * i) / (maxMarkers + 1));
        markers.push({
            position,
            label: formatShortTime(time.toISOString())
        });
    }

    return markers;
});

// Get kills belonging to a specific team for a time group
function getTeamKills(kills: KillmailItem[], teamId: string): KillmailItem[] {
    if (!props.battle?.sides) return [];

    const result: KillmailItem[] = [];

    for (const kill of kills) {
        const victimAlliance = kill.victim?.alliance_id;
        const victimCorp = kill.victim?.corporation_id;

        const side = props.battle.sides[teamId];
        if (!side) continue;

        // Check if this victim belongs to this team
        let belongsToTeam = false;

        // Check alliances
        if (side.alliances_stats) {
            for (const alliance of side.alliances_stats) {
                if (alliance.id === victimAlliance) {
                    belongsToTeam = true;
                    break;
                }
            }
        }

        // Check corporations
        if (!belongsToTeam && side.corporations_stats) {
            for (const corp of side.corporations_stats) {
                if (corp.id === victimCorp) {
                    belongsToTeam = true;
                    break;
                }
            }
        }

        if (belongsToTeam) {
            result.push(kill);
        }
    }

    return result;
}

// Return the appropriate CSS class based on number of sides
function getColumnsClass(numSides: number): string {
    if (numSides <= 2) return 'two-columns';
    if (numSides === 3) return 'three-columns';
    return 'four-columns';
}

// Format time for displays
function formatShortTime(timeString: string | undefined): string {
    if (!timeString) return "";
    const date = new Date(timeString);
    return date.toLocaleTimeString(locale.value, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function formatTimeOnly(timeString: string | undefined): string {
    if (!timeString) return "";
    const date = new Date(timeString);
    return date.toLocaleTimeString(locale.value, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function formatDateOnly(timeString: string | undefined): string {
    if (!timeString) return "";
    const date = new Date(timeString);
    return date.toLocaleDateString(locale.value, {
        month: 'short',
        day: 'numeric'
    });
}

// Format ISK values
function formatIsk(isk: number): string {
    if (isk >= 1000000000000) {
        return `${(isk / 1000000000000).toFixed(1)}T`;
    } else if (isk >= 1000000000) {
        return `${(isk / 1000000000).toFixed(1)}B`;
    } else if (isk >= 1000000) {
        return `${(isk / 1000000).toFixed(1)}M`;
    } else if (isk >= 1000) {
        return `${(isk / 1000).toFixed(1)}K`;
    }
    return `${isk.toFixed(0)}`;
}

// Shorten ship name
function getShortShipName(name: string): string {
    if (!name) return "Unknown";
    // If name is longer than 15 characters, truncate
    return name.length > 12 ? name.substring(0, 10) + '...' : name;
}

// Localization helper
function getLocalizedString(obj: any, localeKey: string): string {
    if (!obj) return "";
    // Convert localeKey from 'en-US' to 'en' if necessary
    const lang = localeKey.split('-')[0];
    return obj[lang] || obj.en || (typeof obj === 'string' ? obj : "");
}
</script>

<style scoped>
.timeline-wrapper {
    width: 100%;
    overflow: hidden;
    /* Prevent horizontal overflow */
    position: relative;
    padding: 20px 0;
    display: flex;
    flex-direction: column;
}

.timeline-container {
    display: flex;
    width: 100%;
    position: relative;
}

/* Timeline line */
.timeline-line {
    width: 30px;
    position: relative;
    flex-shrink: 0;
    background: linear-gradient(to bottom,
            transparent 40px,
            rgba(75, 85, 99, 0.3) 40px,
            rgba(75, 85, 99, 0.8) 50%,
            rgba(75, 85, 99, 0.3) calc(100% - 40px),
            transparent calc(100% - 40px));
}

.timeline-line::before {
    content: '';
    position: absolute;
    top: 40px;
    bottom: 40px;
    left: 50%;
    width: 2px;
    transform: translateX(-50%);
}

/* Time markers */
.timeline-marker {
    font-size: 0.75rem;
    color: light-dark(#6b7280, #9ca3af);
    background-color: light-dark(#ffffff, #1f2937);
    padding: 2px 5px;
    border-radius: 3px;
    text-align: center;
    white-space: nowrap;
    z-index: 5;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.start-marker {
    top: 0;
    font-weight: 600;
}

.end-marker {
    bottom: 0;
    font-weight: 600;
}

.time-marker {
    font-size: 0.7rem;
}

.timeline-date {
    font-size: 0.65rem;
    opacity: 0.8;
}

/* Time groups container */
.time-groups-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    padding-left: 15px;
    overflow: visible;
}

/* Time group */
.time-group {
    position: relative;
    margin-bottom: 20px;
    width: 100%;
}

.time-group:last-child {
    margin-bottom: 0;
}

.time-group-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: light-dark(#6b7280, #9ca3af);
    margin-bottom: 5px;
}

/* Kills grid - responds to number of teams */
.kills-grid {
    display: grid;
    gap: 10px;
    width: 100%;
}

.kills-grid.two-columns {
    grid-template-columns: 1fr 1fr;
}

.kills-grid.three-columns {
    grid-template-columns: 1fr 1fr 1fr;
}

.kills-grid.four-columns {
    grid-template-columns: 1fr 1fr 1fr 1fr;
}

.team-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* Kill card styling */
.kill-card {
    padding: 8px;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
}

.kill-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
    z-index: 2;
}

.kill-card-link {
    display: block;
    text-decoration: none;
    color: inherit;
}

.kill-victim {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}

.victim-portrait {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border-radius: 50%;
}

.victim-details {
    min-width: 0;
    flex-grow: 1;
}

.victim-name {
    font-size: 0.85rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #ef4444;
}

.kill-ship {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
}

.ship-image {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border-radius: 3px;
}

.ship-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-grow: 1;
    min-width: 0;
}

.kill-value {
    white-space: nowrap;
    font-weight: 500;
    color: #38bdf8;
    /* Light blue for ISK */
}

/* Team colors for kill cards */
.kill-card.team-blue {
    background-color: light-dark(rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.15));
    border: 1px solid light-dark(rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.3));
}

.kill-card.team-red {
    background-color: light-dark(rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.15));
    border: 1px solid light-dark(rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.3));
}

.kill-card.team-green {
    background-color: light-dark(rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.15));
    border: 1px solid light-dark(rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.3));
}

.kill-card.team-yellow {
    background-color: light-dark(rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.15));
    border: 1px solid light-dark(rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.3));
}

/* Empty state */
.no-kills {
    text-align: center;
    padding: 20px 0;
    color: light-dark(#6b7280, #9ca3af);
    font-style: italic;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .timeline-container {
        flex-direction: column;
    }

    .timeline-line {
        width: 100%;
        height: 30px;
        margin-bottom: 20px;
        background: linear-gradient(to right,
                transparent 40px,
                rgba(75, 85, 99, 0.3) 40px,
                rgba(75, 85, 99, 0.8) 50%,
                rgba(75, 85, 99, 0.3) calc(100% - 40px),
                transparent calc(100% - 40px));
    }

    .timeline-marker {
        top: 50%;
        transform: translateY(-50%);
    }

    .start-marker {
        left: 0;
        transform: none;
    }

    .end-marker {
        right: 0;
        left: auto;
        transform: none;
    }

    .time-marker {
        left: auto;
        right: auto;
    }

    .time-groups-container {
        padding-left: 0;
        padding-top: 15px;
    }

    .kills-grid.two-columns,
    .kills-grid.three-columns,
    .kills-grid.four-columns {
        grid-template-columns: 1fr;
    }
}
</style>
