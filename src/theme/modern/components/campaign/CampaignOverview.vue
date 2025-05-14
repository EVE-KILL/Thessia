<template>
    <div class="overview-container">
        <!-- Overview Cards -->
        <div class="stats-grid">
            <!-- Efficiency Card -->
            <div class="stat-card">
                <div class="stat-header">
                    <UIcon name="lucide:percent" class="stat-icon" :class="getEfficiencyIconClass(stats.efficiency)" />
                    <div class="stat-title">{{ t('campaign.efficiency') }}</div>
                </div>
                <div class="stat-content">
                    <div class="stat-value" :class="getEfficiencyColorClass(stats.efficiency)">
                        {{ formatPercentage(stats.efficiency) }}
                    </div>
                </div>
            </div>

            <!-- Kills/Losses Card - Horizontal layout -->
            <div class="stat-card">
                <div class="stat-header">
                    <UIcon name="lucide:skull" class="stat-icon text-primary" />
                    <div class="stat-title">{{ t('campaign.kills_losses') }}</div>
                </div>
                <div class="stat-content">
                    <div class="horizontal-stat">
                        <div class="hl-item">
                            <span class="hl-label text-green-500">{{ t('campaign.kills') }}: </span>
                            <span class="hl-value text-green-500">{{ formatNumber(stats.totalKills) }}</span>
                        </div>
                        <UIcon name="lucide:arrow-right" class="hl-arrow" />
                        <div class="hl-item">
                            <span class="hl-label text-red-500">{{ t('campaign.losses') }}: </span>
                            <span class="hl-value text-red-500">{{ formatNumber(stats.totalLosses) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ISK Damage Card - Horizontal layout -->
            <div class="stat-card">
                <div class="stat-header">
                    <UIcon name="lucide:wallet" class="stat-icon text-amber-500" />
                    <div class="stat-title">{{ t('campaign.isk_damage') }}</div>
                </div>
                <div class="stat-content">
                    <div class="horizontal-stat">
                        <div class="hl-item">
                            <span class="hl-label text-green-500">{{ t('campaign.inflicted') }}: </span>
                            <span class="hl-value text-green-500">{{ formatIsk(stats.iskDamageDoneAttacker) }}</span>
                        </div>
                        <UIcon name="lucide:arrow-right" class="hl-arrow" />
                        <div class="hl-item">
                            <span class="hl-label text-red-500">{{ t('campaign.received') }}: </span>
                            <span class="hl-value text-red-500">{{ formatIsk(stats.iskDamageReceivedAttacker) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Total ISK Destroyed -->
            <div class="stat-card">
                <div class="stat-header">
                    <UIcon name="lucide:banknote" class="stat-icon text-purple-500" />
                    <div class="stat-title">{{ t('campaign.total_isk_destroyed') }}</div>
                </div>
                <div class="stat-content">
                    <div class="stat-value">
                        {{ formatIsk(stats.iskDamageDoneAttacker + stats.iskDamageDoneVictim) }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { type ICampaignOutput } from '~/server/interfaces/ICampaignOutput';

// Props
const props = defineProps<{
    stats: ICampaignOutput;
}>();

// Composables
const { t } = useI18n();
const { locale } = useI18n();

// Helpers
const formatIsk = (value: number): string => {
    // Format to 2 decimal places for numbers under 1 billion, otherwise no decimals
    if (Math.abs(value) < 1_000_000_000) {
        return new Intl.NumberFormat(locale.value, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        }).format(value / 1_000_000) + ' M';
    } else {
        return new Intl.NumberFormat(locale.value, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        }).format(value / 1_000_000_000) + ' B';
    }
};

const formatNumber = (value: number): string => {
    return new Intl.NumberFormat(locale.value).format(value);
};

const formatPercentage = (value: number): string => {
    return new Intl.NumberFormat(locale.value, {
        style: 'percent',
        maximumFractionDigits: 1
    }).format(value);
};

const getEfficiencyColorClass = (efficiency: number): string => {
    if (efficiency >= 0.75) return 'text-green-500';
    if (efficiency >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
};

const getEfficiencyIconClass = (efficiency: number): string => {
    if (efficiency >= 0.75) return 'text-green-500';
    if (efficiency >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
};
</script>

<style scoped>
.overview-container {
    background-color: var(--background-800);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1rem;
}

@media (min-width: 640px) {
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 1024px) {
    .stats-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}

.stat-card {
    border: 1px solid rgba(55, 65, 81, 0.3);
    border-radius: 0.375rem;
    overflow: hidden;
}

.stat-header {
    background-color: var(--background-700);
    padding: 0.5rem 1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    border-bottom: 1px solid rgba(55, 65, 81, 0.3);
}

.stat-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
}

.stat-content {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 5rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
}

/* Horizontal stat layout for kills/losses and ISK damage */
.horizontal-stat {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 0.5rem;
}

.hl-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
}

.hl-label {
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
}

.hl-value {
    font-size: 1rem;
    font-weight: 700;
}

.hl-arrow {
    width: 1rem;
    height: 1rem;
    color: var(--gray-400);
    margin: 0 0.25rem;
}

/* Colors */
.text-green-500 {
    color: #10b981;
}

.text-red-500 {
    color: #ef4444;
}

.text-yellow-500 {
    color: #f59e0b;
}

.text-blue-500 {
    color: #3b82f6;
}

.text-purple-500 {
    color: #8b5cf6;
}

.text-cyan-500 {
    color: #06b6d4;
}

.text-amber-500 {
    color: #f59e0b;
}

.text-primary {
    color: var(--primary);
}
</style>
