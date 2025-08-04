<template>
    <div class="achievements-container">
        <!-- Summary Section -->
        <div class="summary-grid">
            <Card>
                <template #header>
                    <div class="card-header">
                        <UIcon name="i-lucide-trophy" class="header-icon primary-color" />
                        <h3 class="header-title">{{ t('achievements.totalPoints') }}</h3>
                    </div>
                </template>
                <div class="stat-value primary-color">
                    {{ achievements?.total_points?.toLocaleString() || 0 }}
                </div>
            </Card>

            <Card>
                <template #header>
                    <div class="card-header">
                        <UIcon name="i-lucide-check-circle" class="header-icon success-color" />
                        <h3 class="header-title">{{ t('achievements.completed') }}</h3>
                    </div>
                </template>
                <div class="stat-value success-color">
                    {{ achievements?.completed_achievements || 0 }} / {{ achievements?.total_achievements || 0 }}
                </div>
            </Card>

            <Card>
                <template #header>
                    <div class="card-header">
                        <UIcon name="i-lucide-clock" class="header-icon info-color" />
                        <h3 class="header-title">{{ t('achievements.lastUpdated') }}</h3>
                    </div>
                </template>
                <div class="date-text">
                    {{ formatDate(achievements?.last_calculated) }}
                </div>
            </Card>
        </div>

        <!-- Filters Section -->
        <Card>
            <template #header>
                <div class="card-header">
                    <UIcon name="i-lucide-filter" class="header-icon" />
                    <h3 class="header-title">{{ t('achievements.filters') }}</h3>
                </div>
            </template>

            <div class="filters-grid">
                <!-- Status Filter -->
                <div>
                    <label class="filter-label">
                        {{ t('achievements.status') }}
                    </label>
                    <div class="filter-buttons">
                        <UButton v-for="status in statusOptions" :key="status.value"
                            :variant="selectedStatus === status.value ? 'solid' : 'soft'"
                            :color="selectedStatus === status.value ? 'primary' : 'neutral'" size="xs"
                            @click="selectedStatus = status.value">
                            {{ status.label }}
                        </UButton>
                    </div>
                </div>

                <!-- Type Filter -->
                <div>
                    <label class="filter-label">
                        {{ t('achievements.type') }}
                    </label>
                    <div class="filter-buttons">
                        <UButton v-for="type in typeOptions" :key="type.value"
                            :variant="selectedType === type.value ? 'solid' : 'soft'"
                            :color="selectedType === type.value ? 'primary' : 'neutral'" size="xs"
                            @click="selectedType = type.value">
                            {{ type.label }}
                        </UButton>
                    </div>
                </div>

                <!-- Rarity Filter -->
                <div>
                    <label class="filter-label">
                        {{ t('achievements.rarity') }}
                    </label>
                    <div class="filter-buttons">
                        <UButton v-for="rarity in rarityOptions" :key="rarity.value"
                            :variant="selectedRarity === rarity.value ? 'solid' : 'soft'"
                            :color="selectedRarity === rarity.value ? 'primary' : 'neutral'" size="xs"
                            @click="selectedRarity = rarity.value">
                            {{ rarity.label }}
                        </UButton>
                    </div>
                </div>

                <!-- Category Filter -->
                <div>
                    <label class="filter-label">
                        {{ t('achievements.category') }}
                    </label>
                    <div class="category-filter-buttons">
                        <UButton v-for="category in categoryOptions" :key="category.value"
                            :variant="selectedCategory === category.value ? 'solid' : 'soft'"
                            :color="selectedCategory === category.value ? 'primary' : 'neutral'" size="xs"
                            @click="selectedCategory = category.value">
                            {{ category.label }}
                        </UButton>
                    </div>
                </div>
            </div>

            <!-- Filter Summary -->
            <div class="filter-summary">
                <div class="filter-status">
                    {{ t('achievements.showing') }} {{ filteredAchievements.length }} {{ t('achievements.of') }} {{
                        achievements?.achievements?.length || 0 }} {{ t('achievements.achievements') }}
                </div>
                <UButton variant="ghost" size="sm" @click="clearFilters" :disabled="!hasActiveFilters">
                    {{ t('achievements.clearFilters') }}
                </UButton>
            </div>
        </Card>

        <!-- Achievements Table -->
        <div v-if="filteredAchievements.length > 0">
            <div class="section-header">
                <h2 class="section-title">{{ t('achievements.yourAchievements') }}</h2>
            </div>

            <!-- Desktop Table -->
            <div class="desktop-table">
                <div class="achievements-table">
                    <!-- Table Header -->
                    <div class="table-header">
                        <div class="col-name">{{ t('achievements.name') }}</div>
                        <div class="col-type">{{ t('achievements.type') }}</div>
                        <div class="col-rarity">{{ t('achievements.rarity') }}</div>
                        <div class="col-progress">{{ t('achievements.progress') }}</div>
                        <div class="col-points">{{ t('achievements.basePoints') }}</div>
                        <div class="col-earned">{{ t('achievements.earnedPoints') }}</div>
                        <div class="col-status">{{ t('achievements.status') }}</div>
                        <div class="col-expand"></div>
                    </div>

                    <!-- Table Body -->
                    <div class="table-body">
                        <div v-for="achievement in filteredAchievements" :key="achievement.achievement_id">
                            <!-- Main Achievement Row -->
                            <div class="achievement-row">
                                <!-- Name -->
                                <div class="col-name">
                                    <div class="achievement-info">
                                        <UIcon :name="getAchievementIcon(achievement)"
                                            :class="['achievement-icon', getRarityColor(achievement.rarity)]" />
                                        <div class="achievement-details">
                                            <div class="achievement-name">
                                                {{ getAchievementName(achievement.achievement_id, achievement.name, t)
                                                }}
                                            </div>
                                            <div class="achievement-description">
                                                {{ getAchievementDescription(achievement.achievement_id,
                                                    achievement.description, t) }}
                                            </div>
                                            <div v-if="hasKillmails(achievement)" class="killmails-count">
                                                {{ t('achievements.killmailsCount', {
                                                    count: achievement.killmailIds?.length || 0
                                                }) }}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Type -->
                                <div class="col-type">
                                    <UBadge :color="getTypeColor(achievement.type)" variant="soft" size="xs">
                                        {{ achievement.type }}
                                    </UBadge>
                                </div>

                                <!-- Rarity -->
                                <div class="col-rarity">
                                    <UBadge :color="getRarityBadgeColor(achievement.rarity)" variant="soft" size="xs">
                                        {{ achievement.rarity }}
                                    </UBadge>
                                </div>

                                <!-- Progress -->
                                <div class="col-progress">
                                    <div class="progress-container">
                                        <div class="progress-text">
                                            <span
                                                :class="achievement.is_completed ? 'progress-completed' : 'progress-pending'">
                                                {{ achievement.current_count.toLocaleString() }} / {{
                                                    achievement.threshold.toLocaleString() }}
                                            </span>
                                            <div class="progress-meta">
                                                <span class="progress-percentage">
                                                    {{ Math.round((achievement.current_count / achievement.threshold) *
                                                    100) }}%
                                                </span>
                                                <span
                                                    v-if="Math.floor(achievement.current_count / achievement.threshold) > 1"
                                                    class="progress-multiplier">
                                                    x{{ Math.floor(achievement.current_count / achievement.threshold) }}
                                                </span>
                                            </div>
                                        </div>
                                        <ProgressBar :value="(achievement.current_count / achievement.threshold) * 100"
                                            size="xs" color="primary" />
                                    </div>
                                </div>

                                <!-- Base Points -->
                                <div class="col-points">
                                    <div class="points-value">
                                        {{ achievement.points.toLocaleString() }}
                                    </div>
                                </div>

                                <!-- Earned Points -->
                                <div class="col-earned">
                                    <div class="earned-points">
                                        {{ (achievement.points * Math.floor(achievement.current_count /
                                            achievement.threshold)).toLocaleString() }}
                                    </div>
                                    <div v-if="Math.floor(achievement.current_count / achievement.threshold) > 1"
                                        class="earned-calculation">
                                        {{ achievement.points }} × {{ Math.floor(achievement.current_count /
                                            achievement.threshold) }}
                                    </div>
                                    <div v-else-if="Math.floor(achievement.current_count / achievement.threshold) === 1"
                                        class="earned-calculation">
                                        {{ achievement.points }} × 1
                                    </div>
                                </div>

                                <!-- Status -->
                                <div class="col-status">
                                    <div class="status-indicator">
                                        <UIcon
                                            :name="achievement.is_completed ? 'i-lucide-check-circle' : achievement.current_count > 0 ? 'i-lucide-clock' : 'i-lucide-circle'"
                                            :class="[
                                                'status-icon',
                                                achievement.is_completed ? 'success-color' : achievement.current_count > 0 ? 'info-color' : 'muted-color'
                                            ]" />
                                        <span class="status-text">
                                            {{ achievement.is_completed ? t('achievements.completed') :
                                                achievement.current_count > 0 ? t('achievements.inProgress') :
                                                    t('achievements.notStarted') }}
                                        </span>
                                    </div>
                                </div>

                                <!-- Expand Button -->
                                <div class="col-expand">
                                    <UButton v-if="hasKillmails(achievement)" variant="ghost" size="sm"
                                        :icon="isExpanded(achievement.achievement_id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                                        @click="toggleKillmailExpansion(achievement)"
                                        :aria-label="isExpanded(achievement.achievement_id) ? t('achievements.hideKillmails') : t('achievements.showKillmails')" />
                                </div>
                            </div>

                            <!-- Expanded Killmails Section -->
                            <div v-if="isExpanded(achievement.achievement_id)" class="expanded-section">
                                <div class="expanded-content">
                                    <h4 class="expanded-title">{{ t('achievements.relatedKillmails') }}</h4>

                                    <!-- Loading State -->
                                    <div v-if="isLoadingKillmails(achievement.achievement_id)" class="loading-section">
                                        <UIcon name="i-lucide-loader-2" class="loading-spinner" />
                                        <p class="loading-text">{{ t('achievements.loadingKillmails') }}</p>
                                    </div>

                                    <!-- Killmails List -->
                                    <div v-else-if="getKillmailsForAchievement(achievement.achievement_id).length > 0"
                                        class="killmails-list">
                                        <div v-for="killmail in getKillmailsForAchievement(achievement.achievement_id)"
                                            :key="killmail.killmail_id" class="killmail-item">
                                            <NuxtLink :to="getKillmailLink(killmail.killmail_id)" class="killmail-link">
                                                <div class="killmail-grid">
                                                    <!-- Victim Ship -->
                                                    <div class="killmail-victim">
                                                        <img :src="`https://images.evetech.net/types/${killmail.victim.ship_id}/icon?size=32`"
                                                            :alt="killmail.victim.ship_name.en || 'Ship'"
                                                            class="ship-image" />
                                                        <div class="victim-info">
                                                            <div class="victim-name">{{ killmail.victim.character_name
                                                                }}</div>
                                                            <div class="ship-name">{{ killmail.victim.ship_name.en }}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- ISK Value -->
                                                    <div class="killmail-value">
                                                        <div class="isk-value">{{ formatIsk(killmail.total_value) }}
                                                        </div>
                                                    </div>

                                                    <!-- System -->
                                                    <div class="killmail-system">
                                                        <div class="system-name">{{ killmail.system_name }}</div>
                                                        <div :class="getSecurityColor(killmail.system_security)"
                                                            class="system-security">
                                                            {{ killmail.system_security.toFixed(1) }}
                                                        </div>
                                                    </div>

                                                    <!-- Final Blow -->
                                                    <div class="killmail-finalblow">
                                                        <img :src="`https://images.evetech.net/characters/${killmail.finalblow.character_id}/portrait?size=32`"
                                                            :alt="killmail.finalblow.character_name"
                                                            class="character-portrait"
                                                            @error="$event.target.src = 'https://images.evetech.net/characters/1/portrait?size=32'" />
                                                        <div class="finalblow-info">
                                                            <div class="character-name">{{
                                                                killmail.finalblow.character_name }}
                                                            </div>
                                                            <div class="corporation-name">{{
                                                                killmail.finalblow.corporation_name
                                                                }}</div>
                                                        </div>
                                                    </div>

                                                    <!-- Attackers -->
                                                    <div class="killmail-attackers">
                                                        <div class="attackers-count">
                                                            {{ killmail.attackerCount }} {{ killmail.attackerCount === 1
                                                            ?
                                                            'attacker' : 'attackers' }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </NuxtLink>
                                        </div>
                                    </div>

                                    <!-- No Killmails -->
                                    <div v-else class="no-killmails">
                                        <p class="no-killmails-text">{{ t('achievements.noKillmails') }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile Cards -->
            <div class="mobile-cards">
                <div v-for="achievement in filteredAchievements" :key="achievement.achievement_id" class="mobile-card">
                    <!-- Mobile Achievement Card -->
                    <div class="mobile-card-content">
                        <div class="mobile-header">
                            <div class="mobile-achievement-info">
                                <UIcon :name="getAchievementIcon(achievement)"
                                    :class="['mobile-achievement-icon', getRarityColor(achievement.rarity)]" />
                                <div class="mobile-achievement-details">
                                    <div class="mobile-achievement-name">
                                        {{ getAchievementName(achievement.achievement_id, achievement.name, t) }}
                                    </div>
                                    <div class="mobile-achievement-description">
                                        {{ getAchievementDescription(achievement.achievement_id,
                                            achievement.description, t) }}
                                    </div>
                                </div>
                            </div>
                            <UButton v-if="hasKillmails(achievement)" variant="ghost" size="sm"
                                :icon="isExpanded(achievement.achievement_id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                                @click="toggleKillmailExpansion(achievement)"
                                :aria-label="isExpanded(achievement.achievement_id) ? t('achievements.hideKillmails') : t('achievements.showKillmails')" />
                        </div>

                        <div class="mobile-content">
                            <!-- Type & Rarity -->
                            <div class="mobile-badges">
                                <UBadge :color="getTypeColor(achievement.type)" variant="soft" size="xs">
                                    {{ achievement.type }}
                                </UBadge>
                                <UBadge :color="getRarityBadgeColor(achievement.rarity)" variant="soft" size="xs">
                                    {{ achievement.rarity }}
                                </UBadge>
                            </div>

                            <!-- Progress -->
                            <div class="mobile-progress">
                                <div class="mobile-progress-text">
                                    <span :class="achievement.is_completed ? 'progress-completed' : 'progress-pending'">
                                        {{ achievement.current_count.toLocaleString() }} / {{
                                            achievement.threshold.toLocaleString() }}
                                    </span>
                                    <span class="progress-percentage">
                                        {{ Math.round((achievement.current_count / achievement.threshold) * 100) }}%
                                    </span>
                                </div>
                                <ProgressBar :value="(achievement.current_count / achievement.threshold) * 100"
                                    size="xs" color="primary" />
                            </div>

                            <!-- Points & Status -->
                            <div class="mobile-footer">
                                <div class="mobile-status">
                                    <UIcon
                                        :name="achievement.is_completed ? 'i-lucide-check-circle' : achievement.current_count > 0 ? 'i-lucide-clock' : 'i-lucide-circle'"
                                        :class="[
                                            'status-icon',
                                            achievement.is_completed ? 'success-color' : achievement.current_count > 0 ? 'info-color' : 'muted-color'
                                        ]" />
                                    <span class="status-text">
                                        {{ achievement.is_completed ? t('achievements.completed') :
                                            achievement.current_count > 0 ? t('achievements.inProgress') :
                                        t('achievements.notStarted') }}
                                    </span>
                                </div>
                                <div class="mobile-points">
                                    {{ (achievement.points * Math.floor(achievement.current_count /
                                        achievement.threshold)).toLocaleString() }} pts
                                </div>
                            </div>

                            <!-- Killmails count -->
                            <div v-if="hasKillmails(achievement)" class="mobile-killmails-count">
                                {{ t('achievements.killmailsCount', { count: achievement.killmailIds?.length || 0 }) }}
                            </div>
                        </div>
                    </div>

                    <!-- Mobile Expanded Killmails Section -->
                    <div v-if="isExpanded(achievement.achievement_id)" class="mobile-expanded-section">
                        <div class="mobile-expanded-content">
                            <h4 class="expanded-title">{{ t('achievements.relatedKillmails') }}</h4>

                            <!-- Loading State -->
                            <div v-if="isLoadingKillmails(achievement.achievement_id)" class="loading-section">
                                <UIcon name="i-lucide-loader-2" class="loading-spinner" />
                                <p class="loading-text">{{ t('achievements.loadingKillmails') }}</p>
                            </div>

                            <!-- Killmails List -->
                            <div v-else-if="getKillmailsForAchievement(achievement.achievement_id).length > 0"
                                class="mobile-killmails-list">
                                <div v-for="killmail in getKillmailsForAchievement(achievement.achievement_id)"
                                    :key="killmail.killmail_id" class="mobile-killmail-item">
                                    <NuxtLink :to="getKillmailLink(killmail.killmail_id)" class="mobile-killmail-link">
                                        <!-- Victim -->
                                        <div class="mobile-killmail-victim">
                                            <img :src="`https://images.evetech.net/types/${killmail.victim.ship_id}/icon?size=32`"
                                                :alt="killmail.victim.ship_name.en || 'Ship'" class="ship-image" />
                                            <div class="mobile-victim-info">
                                                <div class="victim-name">{{ killmail.victim.character_name }}</div>
                                                <div class="ship-name">{{ killmail.victim.ship_name.en }}</div>
                                            </div>
                                            <div class="mobile-isk-value">
                                                <div class="isk-value">{{ formatIsk(killmail.total_value) }}</div>
                                            </div>
                                        </div>

                                        <!-- System & Final Blow -->
                                        <div class="mobile-killmail-details">
                                            <div class="mobile-system-info">
                                                <span class="system-name">{{ killmail.system_name }}</span>
                                                <span :class="getSecurityColor(killmail.system_security)"
                                                    class="system-security">
                                                    ({{ killmail.system_security.toFixed(1) }})
                                                </span>
                                            </div>
                                            <div class="mobile-attackers-info">
                                                {{ killmail.attackerCount }} attackers
                                            </div>
                                        </div>
                                    </NuxtLink>
                                </div>
                            </div>

                            <!-- No Killmails -->
                            <div v-else class="no-killmails">
                                <p class="no-killmails-text">{{ t('achievements.noKillmails') }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- No Achievements State -->
        <div v-else class="no-achievements">
            <UIcon name="i-lucide-trophy" class="no-achievements-icon" />
            <h3 class="no-achievements-title">
                {{ hasActiveFilters ? t('achievements.noMatchingAchievements') : t('achievements.noAchievements') }}
            </h3>
            <p class="no-achievements-description">
                {{ hasActiveFilters ? t('achievements.tryDifferentFilters') : t('achievements.startPlaying') }}
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getAchievementDescription, getAchievementName } from '../../../server/helpers/AchievementTranslations';

interface Props {
    achievements: ICharacterAchievements | null;
}

const props = defineProps<Props>();
const { t } = useI18n();

// Filter state
const selectedStatus = ref('completed_or_progress');
const selectedType = ref('all');
const selectedRarity = ref('all');
const selectedCategory = ref('all');

// Expandable killmails state
const expandedAchievements = ref<Set<string>>(new Set());
const killmailData = ref<Map<string, IKillList[]>>(new Map());
const loadingKillmails = ref<Set<string>>(new Set());

// Status filter options
const statusOptions = [
    { label: t('achievements.completedOrInProgress'), value: 'completed_or_progress' },
    { label: t('achievements.all'), value: 'all' },
    { label: t('achievements.completed'), value: 'completed' },
    { label: t('achievements.inProgress'), value: 'in_progress' },
    { label: t('achievements.notStarted'), value: 'not_started' },
];

// Predefined achievement types
const getAchievementTypes = () => [
    'pvp',
    'pve',
    'exploration',
    'industry',
    'special'
];

// Predefined achievement rarities
const getAchievementRarities = () => [
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary'
];

// Get unique categories from achievements data
const getAchievementCategories = () => {
    const categories = new Set(props.achievements?.achievements?.map(a => a.category) || []);
    return Array.from(categories).sort();
};

// Type filter options
const typeOptions = [
    { label: t('achievements.allTypes'), value: 'all' },
    ...getAchievementTypes().map(type => ({
        label: t(`achievements.types.${type}`),
        value: type
    }))
];

// Rarity filter options
const rarityOptions = [
    { label: t('achievements.allRarities'), value: 'all' },
    ...getAchievementRarities().map(rarity => ({
        label: t(`achievements.rarities.${rarity}`),
        value: rarity
    }))
];

// Category filter options
const categoryOptions = computed(() => [
    { label: t('achievements.allCategories'), value: 'all' },
    ...getAchievementCategories().map(category => ({
        label: category,
        value: category
    }))
]);

// Rarity order for sorting
const rarityOrder = {
    'legendary': 5,
    'epic': 4,
    'rare': 3,
    'uncommon': 2,
    'common': 1
};

// Filtered achievements
const filteredAchievements = computed(() => {
    if (!props.achievements?.achievements) return [];

    let filtered = props.achievements.achievements;

    // Status filter
    if (selectedStatus.value !== 'all') {
        switch (selectedStatus.value) {
            case 'completed_or_progress':
                filtered = filtered.filter(a => a.is_completed || a.current_count > 0);
                break;
            case 'completed':
                filtered = filtered.filter(a => a.is_completed);
                break;
            case 'in_progress':
                filtered = filtered.filter(a => !a.is_completed && a.current_count > 0);
                break;
            case 'not_started':
                filtered = filtered.filter(a => !a.is_completed && a.current_count === 0);
                break;
        }
    }

    // Type filter
    if (selectedType.value !== 'all') {
        filtered = filtered.filter(a => a.type === selectedType.value);
    }

    // Rarity filter
    if (selectedRarity.value !== 'all') {
        filtered = filtered.filter(a => a.rarity === selectedRarity.value);
    }

    // Category filter
    if (selectedCategory.value !== 'all') {
        filtered = filtered.filter(a => a.category === selectedCategory.value);
    }

    // Sort achievements
    return filtered.sort((a, b) => {
        // First, prioritize completed achievements
        if (a.is_completed && !b.is_completed) return -1;
        if (!a.is_completed && b.is_completed) return 1;

        // Then sort by rarity
        const rarityDiff = (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0);
        if (rarityDiff !== 0) return rarityDiff;

        // Finally sort by cumulative points descending
        const aCumulativePoints = a.points * Math.floor(a.current_count / a.threshold);
        const bCumulativePoints = b.points * Math.floor(b.current_count / b.threshold);
        return bCumulativePoints - aCumulativePoints;
    });
});

// Check if any filters are active
const hasActiveFilters = computed(() => {
    const statusIsFiltered = selectedStatus.value !== 'completed_or_progress' && selectedStatus.value !== 'all';
    return statusIsFiltered ||
        selectedType.value !== 'all' ||
        selectedRarity.value !== 'all' ||
        selectedCategory.value !== 'all';
});

// Clear all filters
const clearFilters = () => {
    selectedStatus.value = 'completed_or_progress';
    selectedType.value = 'all';
    selectedRarity.value = 'all';
    selectedCategory.value = 'all';
};

// Get achievement icon based on type
const getAchievementIcon = (achievement: ICharacterAchievement) => {
    const icons = {
        pvp: 'i-lucide-swords',
        pve: 'i-lucide-target',
        exploration: 'i-lucide-compass',
        industry: 'i-lucide-factory',
        special: 'i-lucide-star'
    };
    return icons[achievement.type as keyof typeof icons] || 'i-lucide-award';
};

// Get rarity color for icons
const getRarityColor = (rarity: string) => {
    const colors = {
        common: 'muted-color',
        uncommon: 'success-color',
        rare: 'info-color',
        epic: 'accent-color',
        legendary: 'warning-color'
    };
    return colors[rarity as keyof typeof colors] || 'muted-color';
};

// Get type color for badges
const getTypeColor = (type: string) => {
    const colors = {
        pvp: 'red',
        pve: 'blue',
        exploration: 'green',
        industry: 'orange',
        special: 'purple'
    };
    return colors[type as keyof typeof colors] || 'gray';
};

// Get rarity color for badges
const getRarityBadgeColor = (rarity: string) => {
    const colors = {
        common: 'gray',
        uncommon: 'green',
        rare: 'blue',
        epic: 'purple',
        legendary: 'amber'
    };
    return colors[rarity as keyof typeof colors] || 'gray';
};

// Format date for display
const formatDate = (date: Date | string | undefined) => {
    if (!date) return t('achievements.never');
    return format(new Date(date), 'MMM d, yyyy');
};

// Toggle killmail expansion
const toggleKillmailExpansion = async (achievement: ICharacterAchievement) => {
    const achievementId = achievement.achievement_id;

    if (expandedAchievements.value.has(achievementId)) {
        expandedAchievements.value.delete(achievementId);
    } else {
        expandedAchievements.value.add(achievementId);

        if (!killmailData.value.has(achievementId) && achievement.killmailIds && achievement.killmailIds.length > 0) {
            await fetchKillmailsForAchievement(achievement);
        }
    }
};

// Fetch killmail data for an achievement
const fetchKillmailsForAchievement = async (achievement: ICharacterAchievement) => {
    if (!achievement.killmailIds || achievement.killmailIds.length === 0) return;

    const achievementId = achievement.achievement_id;
    loadingKillmails.value.add(achievementId);

    try {
        const killmails = await $fetch<IKillmail[]>('/api/killmail/batch', {
            method: 'POST',
            body: {
                ids: achievement.killmailIds
            }
        });

        const killList = killmails.map(formatKillmailToKillList);
        killmailData.value.set(achievementId, killList);
    } catch (error) {
        console.error('Error fetching killmails for achievement:', error);
        killmailData.value.set(achievementId, []);
    } finally {
        loadingKillmails.value.delete(achievementId);
    }
};

// Format killmail data to KillList format
const formatKillmailToKillList = (killmail: IKillmail): IKillList => {
    const finalBlowAttacker = killmail.attackers.find(attacker => attacker.final_blow);

    return {
        killmail_id: killmail.killmail_id,
        total_value: killmail.total_value,
        system_id: killmail.system_id,
        system_name: killmail.system_name,
        system_security: killmail.system_security,
        region_id: killmail.region_id,
        region_name: killmail.region_name,
        kill_time: typeof killmail.kill_time === 'string' ? killmail.kill_time : killmail.kill_time.toISOString(),
        attackerCount: killmail.attackers.length,
        commentCount: 0,
        is_npc: killmail.is_npc,
        is_solo: killmail.is_solo,
        victim: {
            ship_id: killmail.victim.ship_id,
            ship_name: killmail.victim.ship_name,
            character_id: killmail.victim.character_id,
            character_name: killmail.victim.character_name,
            corporation_id: killmail.victim.corporation_id,
            corporation_name: killmail.victim.corporation_name,
            alliance_id: killmail.victim.alliance_id,
            alliance_name: killmail.victim.alliance_name,
            faction_id: killmail.victim.faction_id,
            faction_name: killmail.victim.faction_name,
        },
        finalblow: finalBlowAttacker ? {
            character_id: finalBlowAttacker.character_id,
            character_name: finalBlowAttacker.character_name,
            corporation_id: finalBlowAttacker.corporation_id,
            corporation_name: finalBlowAttacker.corporation_name,
            alliance_id: finalBlowAttacker.alliance_id,
            alliance_name: finalBlowAttacker.alliance_name,
            faction_id: finalBlowAttacker.faction_id,
            faction_name: finalBlowAttacker.faction_name,
            ship_group_name: finalBlowAttacker.ship_group_name || {},
            is_npc: finalBlowAttacker.character_id === 0,
        } : {
            character_id: 0,
            character_name: 'Unknown',
            corporation_id: 0,
            corporation_name: 'Unknown',
            alliance_id: 0,
            alliance_name: 'Unknown',
            faction_id: 0,
            faction_name: 'Unknown',
            ship_group_name: {},
            is_npc: true,
        }
    };
};

// Check if an achievement is expanded
const isExpanded = (achievementId: string): boolean => {
    return expandedAchievements.value.has(achievementId);
};

// Check if an achievement has killmails
const hasKillmails = (achievement: ICharacterAchievement): boolean => {
    return achievement.killmailIds && achievement.killmailIds.length > 0;
};

// Get killmails for an achievement
const getKillmailsForAchievement = (achievementId: string): IKillList[] => {
    return killmailData.value.get(achievementId) || [];
};

// Check if killmails are loading
const isLoadingKillmails = (achievementId: string): boolean => {
    return loadingKillmails.value.has(achievementId);
};

// Format ISK values
const formatIsk = (value: number): string => {
    if (!value) return "0 ISK";

    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(1)}B ISK`;
    }
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M ISK`;
    }
    return `${Math.round(value).toLocaleString()} ISK`;
};

// Format security status color
const getSecurityColor = (security: number): string => {
    if (security >= 0.45) return 'success-color';
    if (security >= 0.05) return 'warning-color';
    return 'danger-color';
};

// Generate killmail link
const getKillmailLink = (killmailId: number): string => {
    return `/kill/${killmailId}`;
};
</script>

<style scoped>
.achievements-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
}

/* Summary Grid */
.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-4);
}

.card-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.header-icon {
    width: var(--space-5);
    height: var(--space-5);
}

.header-title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
}

.stat-value {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    margin-top: var(--space-2);
}

.date-text {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin-top: var(--space-2);
}

/* Filters */
.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-4);
}

.filter-label {
    display: block;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
}

.filter-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
}

.category-filter-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    max-height: 5rem;
    overflow-y: auto;
}

.filter-summary {
    margin-top: var(--space-6);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
}

.filter-status {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
}

/* Section Header */
.section-header {
    margin-bottom: var(--space-4);
}

.section-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
}

/* Desktop Table */
.desktop-table {
    display: none;
}

@media (min-width: 1024px) {
    .desktop-table {
        display: block;
    }
}

.achievements-table {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
}

.table-header {
    display: grid;
    grid-template-columns: 4fr 1fr 1fr 2fr 1fr 1fr 1fr 1fr;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-6);
    background: var(--color-surface-secondary);
    border-bottom: 1px solid var(--color-border);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
}

.col-name {
    justify-self: start;
}

.col-type,
.col-rarity,
.col-points,
.col-earned,
.col-status {
    text-align: center;
}

.col-progress {
    justify-self: start;
}

.col-expand {
    justify-self: end;
}

.table-body {
    border-top: 1px solid var(--color-border);
}

.achievement-row {
    display: grid;
    grid-template-columns: 4fr 1fr 1fr 2fr 1fr 1fr 1fr 1fr;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-6);
    align-items: center;
    font-size: var(--text-sm);
    border-bottom: 1px solid var(--color-border);
    transition: background-color var(--duration-fast);
}

.achievement-row:hover {
    background: var(--color-surface-hover);
}

.achievement-info {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
}

.achievement-icon {
    width: var(--space-5);
    height: var(--space-5);
    flex-shrink: 0;
}

.achievement-details {
    min-width: 0;
    flex: 1;
}

.achievement-name {
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.achievement-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: var(--space-1);
}

.killmails-count {
    font-size: var(--text-xs);
    color: var(--color-info);
    margin-top: var(--space-1);
}

.progress-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
    width: 100%;
}

.progress-text {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--text-xs);
}

.progress-completed {
    color: var(--color-success);
    font-weight: var(--font-medium);
}

.progress-pending {
    color: var(--color-text-secondary);
}

.progress-meta {
    display: flex;
    align-items: center;
    gap: var(--space-1);
}

.progress-percentage {
    color: var(--color-text-secondary);
}

.progress-multiplier {
    color: var(--color-text-secondary);
}

.points-value {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-secondary);
    text-align: center;
}

.earned-points {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-warning);
    text-align: center;
}

.earned-calculation {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    text-align: center;
    margin-top: var(--space-1);
}

.status-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
}

.status-icon {
    width: var(--space-4);
    height: var(--space-4);
}

.status-text {
    font-size: var(--text-xs);
}

/* Expanded Section */
.expanded-section {
    border-top: 1px solid var(--color-border);
    background: var(--color-surface-secondary);
}

.expanded-content {
    padding: var(--space-6);
}

.expanded-title {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
    margin-bottom: var(--space-3);
}

.loading-section {
    text-align: center;
    padding: var(--space-4) 0;
}

.loading-spinner {
    width: var(--space-5);
    height: var(--space-5);
    margin: 0 auto;
    animation: spin 1s linear infinite;
}

.loading-text {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin-top: var(--space-2);
}

.killmails-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.killmail-item {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-3);
    transition: box-shadow var(--duration-fast);
}

.killmail-item:hover {
    box-shadow: var(--shadow-md);
}

.killmail-link {
    display: block;
    text-decoration: none;
    color: inherit;
}

.killmail-grid {
    display: grid;
    grid-template-columns: 3fr 2fr 2fr 3fr 2fr;
    gap: var(--space-3);
    align-items: center;
    font-size: var(--text-sm);
}

.killmail-victim {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.ship-image {
    width: 2rem;
    height: 2rem;
    border-radius: var(--radius-sm);
}

.victim-info {
    min-width: 0;
    flex: 1;
}

.victim-name {
    font-weight: var(--font-medium);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ship-name {
    color: var(--color-text-secondary);
    font-size: var(--text-xs);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.killmail-value {
    text-align: right;
}

.isk-value {
    font-weight: var(--font-medium);
}

.killmail-system {
    text-align: center;
}

.system-name {
    font-weight: var(--font-medium);
}

.system-security {
    font-size: var(--text-xs);
}

.killmail-finalblow {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.character-portrait {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
}

.finalblow-info {
    min-width: 0;
    flex: 1;
}

.character-name {
    font-weight: var(--font-medium);
    font-size: var(--text-xs);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.corporation-name {
    color: var(--color-text-secondary);
    font-size: var(--text-xs);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.killmail-attackers {
    text-align: right;
}

.attackers-count {
    font-weight: var(--font-medium);
    font-size: var(--text-xs);
}

.no-killmails {
    text-align: center;
    padding: var(--space-4) 0;
}

.no-killmails-text {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
}

/* Mobile Cards */
.mobile-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

@media (min-width: 1024px) {
    .mobile-cards {
        display: none;
    }
}

.mobile-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    overflow: hidden;
}

.mobile-card-content {
    padding: var(--space-4);
}

.mobile-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: var(--space-4);
}

.mobile-achievement-info {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    min-width: 0;
}

.mobile-achievement-icon {
    width: var(--space-6);
    height: var(--space-6);
    flex-shrink: 0;
}

.mobile-achievement-details {
    min-width: 0;
    flex: 1;
}

.mobile-achievement-name {
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
}

.mobile-achievement-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin-top: var(--space-1);
}

.mobile-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
}

.mobile-badges {
    display: flex;
    gap: var(--space-2);
}

.mobile-progress {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.mobile-progress-text {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--text-xs);
}

.mobile-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--text-sm);
}

.mobile-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.mobile-points {
    color: var(--color-warning);
    font-weight: var(--font-medium);
}

.mobile-killmails-count {
    font-size: var(--text-xs);
    color: var(--color-info);
}

/* Mobile Expanded Section */
.mobile-expanded-section {
    border-top: 1px solid var(--color-border);
    background: var(--color-surface-secondary);
}

.mobile-expanded-content {
    padding: var(--space-4);
}

.mobile-killmails-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
}

.mobile-killmail-item {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-3);
}

.mobile-killmail-link {
    display: block;
    text-decoration: none;
    color: inherit;
}

.mobile-killmail-victim {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
}

.mobile-victim-info {
    flex: 1;
    min-width: 0;
}

.mobile-isk-value {
    text-align: right;
}

.mobile-killmail-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--text-xs);
}

.mobile-system-info {
    display: flex;
    align-items: center;
    gap: var(--space-1);
}

.mobile-attackers-info {
    color: var(--color-text-secondary);
}

/* No Achievements State */
.no-achievements {
    text-align: center;
    padding: var(--space-12) 0;
}

.no-achievements-icon {
    width: 4rem;
    height: 4rem;
    color: var(--color-text-tertiary);
    margin: 0 auto var(--space-4);
}

.no-achievements-title {
    font-size: var(--text-lg);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
}

.no-achievements-description {
    color: var(--color-text-secondary);
}

/* Color Classes */
.primary-color {
    color: var(--color-primary);
}

.success-color {
    color: var(--color-success);
}

.info-color {
    color: var(--color-info);
}

.warning-color {
    color: var(--color-warning);
}

.danger-color {
    color: var(--color-danger);
}

.accent-color {
    color: var(--color-accent);
}

.muted-color {
    color: var(--color-text-tertiary);
}

/* Animations */
@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .achievements-container {
        gap: var(--space-4);
    }

    .summary-grid {
        grid-template-columns: 1fr;
    }

    .filters-grid {
        grid-template-columns: 1fr;
    }
}
</style>
