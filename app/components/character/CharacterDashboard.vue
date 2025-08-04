<template>
    <div class="character-dashboard">
        <div class="grid-container">
            <!-- Character Bio Section -->
            <Card class="bio-card">
                <template #header>
                    <div class="header-container">
                        <h3 class="header-title">{{ $t('bio') }}</h3>
                    </div>
                </template>

                <div v-if="characterBio" class="character-bio" v-html="characterBio"></div>
                <div v-else class="empty-bio">
                    {{ $t('noBio') }}
                </div>
            </Card>

            <!-- Character Stats Section -->
            <Card class="stats-card">
                <template #header>
                    <div class="header-container">
                        <h3 class="header-title">
                            {{ $t('stats') }} ({{ activePeriodLabel }})
                        </h3>
                        <div class="period-selector">
                            <UButton v-for="period in periods" :key="period.value" size="xs"
                                :variant="activePeriod === period.value ? 'solid' : 'outline'"
                                @click="changePeriod(period.value)">
                                {{ period.label }}
                            </UButton>
                        </div>
                    </div>
                </template>

                <!-- Loading state -->
                <div v-if="statsLoading" class="loading-container">
                    <UIcon name="i-lucide-loader-2" class="loading-icon" size="xl" />
                </div>

                <!-- Stats content when loaded -->
                <div v-else-if="stats" class="stats-content">
                    <!-- Basic Stats -->
                    <div class="stats-table-container">
                        <Table :columns="statColumns" :items="formattedStats" background="transparent"
                            :show-header="false" density="compact" :bordered="false" :fit-content="false"
                            :special-header="true">
                            <template #cell-name="{ item }">
                                <div class="stat-name">{{ (item as any).name }}</div>
                            </template>
                            <template #cell-value="{ item }">
                                <div class="stat-value">{{ (item as any).value }}</div>
                            </template>
                        </Table>
                    </div>

                    <!-- Heat Map Activity -->
                    <div class="heat-map-container">
                        <h3 class="section-title">{{ $t('heatMap') }}</h3>
                        <div class="heat-map-grid">
                            <div v-for="(count, hour) in stats.full.heatMap" :key="hour" class="heat-map-hour">
                                <div class="heat-map-cell"
                                    :class="getHeatMapColor(count, getMaxHeatMapValue(stats.full.heatMap))">
                                    <div class="hour-label">{{ hour.replace('h', '') }}:00</div>
                                    <div class="hour-value">{{ formatNumber(count) }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Most Used Ships -->
                    <div v-if="stats.full.mostUsedShips && Object.keys(stats.full.mostUsedShips).length > 0"
                        class="stats-section">
                        <h3 class="section-title">{{ $t('mostUsedShips') }}</h3>
                        <Table :columns="shipColumns" :items="sortByCountDesc(stats.full.mostUsedShips)"
                            background="transparent" density="compact" :bordered="false" :special-header="true">
                            <template #cell-name="{ item }">
                                <div class="entity-name">{{ getLocalizedString((item as any).name, currentLocale) }}
                                </div>
                            </template>
                            <template #cell-count="{ item }">
                                <div class="count-value">{{ formatNumber((item as any).count) }}</div>
                            </template>
                        </Table>
                    </div>

                    <!-- Most Lost Ships -->
                    <div v-if="stats.full.mostLostShips && Object.keys(stats.full.mostLostShips).length > 0"
                        class="stats-section">
                        <h3 class="section-title">{{ $t('mostLostShips') }}</h3>
                        <Table :columns="shipColumns" :items="sortByCountDesc(stats.full.mostLostShips)"
                            background="transparent" density="compact" :bordered="false" :special-header="true">
                            <template #cell-name="{ item }">
                                <div class="entity-name">{{ getLocalizedString((item as any).name, currentLocale) }}
                                </div>
                            </template>
                            <template #cell-count="{ item }">
                                <div class="count-value">{{ formatNumber((item as any).count) }}</div>
                            </template>
                        </Table>
                    </div>

                    <!-- Dies To Corporations -->
                    <div v-if="stats.full.diesToCorporations && Object.keys(stats.full.diesToCorporations).length > 0"
                        class="stats-section">
                        <h3 class="section-title">{{ $t('diesToCorporations') }}</h3>
                        <Table :columns="corpColumns" :items="sortByCountDesc(stats.full.diesToCorporations)"
                            background="transparent" density="compact" :bordered="false" :special-header="true">
                            <template #cell-name="{ item }">
                                <div class="entity-name">{{ (item as any).name }}</div>
                            </template>
                            <template #cell-count="{ item }">
                                <div class="count-value">{{ formatNumber((item as any).count) }}</div>
                            </template>
                        </Table>
                    </div>

                    <!-- Dies To Alliances -->
                    <div v-if="stats.full.diesToAlliances && Object.keys(stats.full.diesToAlliances).length > 0"
                        class="stats-section">
                        <h3 class="section-title">{{ $t('diesToAlliances') }}</h3>
                        <Table :columns="allianceColumns" :items="sortByCountDesc(stats.full.diesToAlliances)"
                            background="transparent" density="compact" :bordered="false" :special-header="true">
                            <template #cell-name="{ item }">
                                <div class="entity-name">{{ (item as any).name }}</div>
                            </template>
                            <template #cell-count="{ item }">
                                <div class="count-value">{{ formatNumber((item as any).count) }}</div>
                            </template>
                        </Table>
                    </div>

                    <!-- Flies With Corporations -->
                    <div v-if="stats.full.fliesWithCorporations && Object.keys(stats.full.fliesWithCorporations).length > 0"
                        class="stats-section">
                        <h3 class="section-title">{{ $t('fliesWithCorporations') }}</h3>
                        <Table :columns="corpColumns" :items="sortByCountDesc(stats.full.fliesWithCorporations)"
                            background="transparent" density="compact" :bordered="false" :special-header="true">
                            <template #cell-name="{ item }">
                                <div class="entity-name">{{ (item as any).name }}</div>
                            </template>
                            <template #cell-count="{ item }">
                                <div class="count-value">{{ formatNumber((item as any).count) }}</div>
                            </template>
                        </Table>
                    </div>

                    <!-- Flies With Alliances -->
                    <div v-if="stats.full.fliesWithAlliances && Object.keys(stats.full.fliesWithAlliances).length > 0"
                        class="stats-section">
                        <h3 class="section-title">{{ $t('fliesWithAlliances') }}</h3>
                        <Table :columns="allianceColumns" :items="sortByCountDesc(stats.full.fliesWithAlliances)"
                            background="transparent" density="compact" :bordered="false" :special-header="true">
                            <template #cell-name="{ item }">
                                <div class="entity-name">{{ (item as any).name }}</div>
                            </template>
                            <template #cell-count="{ item }">
                                <div class="count-value">{{ formatNumber((item as any).count) }}</div>
                            </template>
                        </Table>
                    </div>
                </div>

                <!-- Error message -->
                <div v-else-if="statsError" class="error-container">
                    <UIcon name="i-lucide-alert-triangle" class="error-icon" size="lg" />
                    <p class="error-message">{{ $t('common.errorLoadingData') }}</p>
                    <UButton size="sm" variant="ghost" class="retry-button" @click="() => fetchStats(activePeriod)">
                        {{ $t('common.retry') }}
                    </UButton>
                </div>
            </Card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";
import { de, enUS, es, fr, ja, ko, ru, zhCN } from "date-fns/locale";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";

// Types
interface StatItem {
    name: string;
    value: string;
}

interface CountItem {
    name: string | Record<string, string>;
    count: number;
}

const props = defineProps({
    character: {
        type: Object,
        required: true,
    },
});

const { t, locale } = useI18n();
const { convertEveHtml } = useEveHtmlParser();
const currentLocale = computed(() => locale.value);

// Period handling
const activePeriod = ref("90");
const periods = [
    { value: "14", label: "14d" },
    { value: "30", label: "30d" },
    { value: "90", label: "90d" },
    { value: "all", label: t("allTime") },
];

const activePeriodLabel = computed(() => {
    if (activePeriod.value === "all") return t("allTime");
    return `${activePeriod.value}d`;
});

// Character bio
const characterBio = computed(() => {
    if (!props.character?.description) return "";
    return convertEveHtml(props.character.description);
});

// Stats data
const stats = ref<any>(null);
const statsLoading = ref(true);
const statsError = ref(false);

// Table columns
const statColumns = [
    { id: "name", header: t("name"), width: "50%" },
    { id: "value", header: t("value"), headerClass: "text-right", width: "50%" },
];

const shipColumns = [
    { id: "name", header: t("ship"), width: "75%" },
    { id: "count", header: t("count"), headerClass: "text-right", width: "25%" },
];

const corpColumns = [
    { id: "name", header: t("corporation"), width: "75%" },
    { id: "count", header: t("count"), headerClass: "text-right", width: "25%" },
];

const allianceColumns = [
    { id: "name", header: t("alliance"), width: "75%" },
    { id: "count", header: t("count"), headerClass: "text-right", width: "25%" },
];

// Timezone data (evening playtimes)
const timezones = {
    "EUTZ Morning": [7, 12],
    "EUTZ Afternoon": [12, 17],
    "EUTZ Evening": [17, 22],
    "USWTZ Morning": [14, 19],
    "USWTZ Afternoon": [19, 0],
    "USWTZ Evening": [0, 5],
    "USETZ Morning": [11, 16],
    "USETZ Afternoon": [16, 21],
    "USETZ Evening": [21, 2],
    "AUTZ Morning": [21, 2],
    "AUTZ Afternoon": [2, 7],
    "AUTZ Evening": [7, 12],
    "CHTZ Morning": [23, 4],
    "CHTZ Afternoon": [4, 9],
    "CHTZ Evening": [9, 14],
    "RUTZ Morning": [4, 9],
    "RUTZ Afternoon": [9, 14],
    "RUTZ Evening": [14, 19],
};

// Date locale mapping
const dateLocales = {
    en: enUS,
    de: de,
    es: es,
    fr: fr,
    ja: ja,
    ko: ko,
    ru: ru,
    zh: zhCN,
};

// Helper functions
function getLocalizedString(obj: any, locale: string): string {
    if (!obj) return "";
    return obj[locale] || obj.en || "";
}

const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return formatDistanceToNow(date, {
        addSuffix: true,
        locale: dateLocales[currentLocale.value] || enUS,
    });
};

const formatNumber = (value: number): string => {
    return new Intl.NumberFormat().format(value || 0);
};

const sortByCountDesc = (items: Record<string, any>) => {
    if (!items) return [];
    return Object.values(items)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 only
};

const changePeriod = (period: string) => {
    activePeriod.value = period;
    fetchStats(period);
};

const determineActiveTimezone = (heatMap: Record<string, number> | undefined): string => {
    if (!heatMap) return "Unknown";

    const hours = Object.entries(heatMap).map(([hour, count]) => ({
        hour: Number.parseInt(hour.replace("h", "")),
        count,
    }));

    const sortedHours = hours.sort((a, b) => b.count - a.count);

    if (sortedHours.length === 0) return "Unknown";

    const activeHour = sortedHours[0].hour;

    for (const [timezone, [start, end]] of Object.entries(timezones)) {
        if (start > end) {
            if (activeHour >= start || activeHour <= end) {
                return timezone;
            }
        } else {
            if (activeHour >= start && activeHour <= end) {
                return timezone;
            }
        }
    }

    return "Unknown";
};

const getHeatMapColor = (count: number, maxValue: number): string => {
    if (!count || !maxValue) return "heat-0";

    const intensity = Math.min(Math.floor((count / maxValue) * 10), 10);
    return `heat-${intensity}`;
};

const getMaxHeatMapValue = (heatMap: Record<string, number>): number => {
    if (!heatMap) return 0;
    return Math.max(...Object.values(heatMap));
};

const formattedStats = computed(() => {
    if (!stats.value) return [];

    const activeTimezone = determineActiveTimezone(stats.value.full.heatMap);

    return [
        { name: t("kills"), value: formatNumber(stats.value.kills) },
        { name: t("losses"), value: formatNumber(stats.value.losses) },
        { name: `${t("isk")} ${t("killed")}`, value: formatIsk(stats.value.iskKilled) },
        { name: `${t("isk")} ${t("lost")}`, value: formatIsk(stats.value.iskLost) },
        { name: `${t("solo")} ${t("kills")}`, value: formatNumber(stats.value.soloKills) },
        { name: `${t("solo")} ${t("losses")}`, value: formatNumber(stats.value.soloLosses) },
        { name: `${t("npc")} ${t("losses")}`, value: formatNumber(stats.value.npcLosses) },
        { name: t("blobFactor"), value: stats.value.full.blobFactor?.toFixed(2) || "0.00" },
        { name: t("lastActive"), value: formatDate(stats.value.lastActive) },
        { name: t("activeTimezone"), value: activeTimezone },
        { name: t("knownFC"), value: stats.value.full.possibleFC ? t("yes") : t("no") },
        { name: t("knownCynoAlt"), value: stats.value.full.possibleCynoAlt ? t("yes") : t("no") },
    ];
});

const fetchStats = async (period = "90") => {
    if (!props.character?.character_id) {
        stats.value = null;
        statsLoading.value = false;
        statsError.value = false;
        return;
    }

    statsLoading.value = true;
    statsError.value = false;

    try {
        const url = `/api/stats/character_id/${props.character.character_id}${period === "all" ? "?days=0" : `?days=${period}`}`;
        const data = await $fetch(url);
        stats.value = data;
        statsError.value = false;
    } catch (error) {
        console.error(`Failed to fetch character stats for ${props.character.character_id} (period: ${period}):`, error);
        statsError.value = true;
        stats.value = null;
    } finally {
        statsLoading.value = false;
    }
};

onMounted(() => {
    fetchStats(activePeriod.value);
});

onUnmounted(() => {
    // Component cleanup if needed
});
</script>

<style scoped>
/* Layout */
.character-dashboard {
    width: 100%;
}

.grid-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
}

@media (min-width: 1024px) {
    .grid-container {
        grid-template-columns: 1fr 1fr;
    }
}

/* Card styling */
.bio-card,
.stats-card {
    overflow: hidden;
}

/* Header */
.header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
}

.header-title {
    font-size: var(--text-lg);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    margin: 0;
}

.period-selector {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
}

/* Bio styling */
.character-bio {
    line-height: var(--line-height-tight);
    font-family: var(--font-mono);
    word-break: break-word;
    font-size: var(--text-xl);
    padding: var(--space-2);
    overflow-y: auto;
    color: var(--color-text-primary);
}

.character-bio a {
    color: var(--color-brand-primary);
    text-decoration: none;
}

.character-bio a:hover {
    text-decoration: underline;
}

.empty-bio {
    text-align: center;
    padding: var(--space-4) 0;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
}

/* Loading and error states */
.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--space-8) 0;
}

.loading-icon {
    animation: spin var(--duration-slow) linear infinite;
    color: var(--color-text-muted);
}

.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8) var(--space-4);
    gap: var(--space-3);
}

.error-icon {
    color: var(--color-warning-500);
}

.error-message {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0;
}

.retry-button {
    margin-top: var(--space-3);
}

/* Stats content */
.stats-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
}

.stats-table-container {
    margin-bottom: var(--space-2);
}

.stat-name {
    font-weight: var(--font-weight-normal);
    color: var(--color-text-secondary);
}

.stat-value {
    text-align: right;
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
}

.entity-name {
    color: var(--color-text-primary);
}

.count-value {
    text-align: right;
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
}

.section-title {
    font-size: var(--text-base);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--space-2);
    color: var(--color-text-primary);
    border-bottom: 1px solid var(--color-border-secondary);
    padding-bottom: var(--space-1);
}

.stats-section {
    margin-bottom: var(--space-6);
}

/* Heat map */
.heat-map-container {
    margin-bottom: var(--space-6);
}

.heat-map-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-2);
}

@media (min-width: 768px) {
    .heat-map-grid {
        grid-template-columns: repeat(6, 1fr);
    }
}

@media (min-width: 1024px) {
    .heat-map-grid {
        grid-template-columns: repeat(8, 1fr);
    }
}

.heat-map-hour {
    position: relative;
    color: var(--color-text-primary);
}

.heat-map-cell {
    padding: var(--space-2);
    text-align: center;
    border-radius: var(--radius-md);
    transition: all var(--duration-normal) ease;
}

.hour-label {
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
}

.hour-value {
    font-size: var(--text-xs);
    line-height: var(--line-height-tight);
}

/* Heat map intensity colors */
.heat-0 {
    background-color: var(--color-surface-tertiary);
}

.heat-1 {
    background-color: var(--color-brand-950);
}

.heat-2 {
    background-color: var(--color-brand-900);
}

.heat-3 {
    background-color: var(--color-brand-800);
}

.heat-4 {
    background-color: var(--color-brand-700);
}

.heat-5 {
    background-color: var(--color-brand-600);
}

.heat-6 {
    background-color: var(--color-brand-500);
}

.heat-7 {
    background-color: var(--color-brand-400);
}

.heat-8 {
    background-color: var(--color-brand-300);
}

.heat-9 {
    background-color: var(--color-brand-200);
}

.heat-10 {
    background-color: var(--color-brand-100);
}

/* Deep table styling */
:deep(.body-cell) {
    padding: var(--space-1) var(--space-2);
}

:deep(.table-header) {
    padding: var(--space-2);
}

:deep(.table-row) {
    padding: var(--space-1) 0;
}

/* Animations */
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
