<template>
    <div class="domain-dashboard-modular">
        <!-- Example of using the modular components directly -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- Total Kills Box -->
            <DomainDashboardTotalKillsBox :domain="domain" :time-range="timeRange" title="Total Kills" size="md" />

            <!-- ISK Destroyed Box -->
            <DomainDashboardISKDestroyedBox :domain="domain" :time-range="timeRange" title="ISK Destroyed"
                :show-raw-number="false" size="md" />

            <!-- Top Ship Box -->
            <DomainDashboardTopShipBox :domain="domain" :time-range="timeRange" title="Top Ship" count-label="kills"
                :show-ship-icon="true" :show-percentage="true" size="md" />

            <!-- Active Entities Box -->
            <DomainDashboardActiveEntitiesBox :domain="domain" :time-range="timeRange" title="Active Pilots"
                entity-type="characters" :show-breakdown="false" size="md" />
        </div>

        <!-- Example of larger variants -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Larger Active Entities with breakdown -->
            <DomainDashboardActiveEntitiesBox :domain="domain" :time-range="timeRange" title="All Active Entities"
                entity-type="all" :show-breakdown="true" size="lg" custom-class="col-span-1" />

            <!-- Custom styled ISK box -->
            <DomainDashboardISKDestroyedBox :domain="domain" :time-range="timeRange" title="Total Value Destroyed"
                :show-raw-number="true" currency="ISK" size="lg" :custom-styles="{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: '2px solid #667eea'
                }" />
        </div>
    </div>
</template>

<script setup lang="ts">
import DomainDashboardActiveEntitiesBox from './stats/DomainDashboardActiveEntitiesBox.vue';
import DomainDashboardISKDestroyedBox from './stats/DomainDashboardISKDestroyedBox.vue';
import DomainDashboardTopShipBox from './stats/DomainDashboardTopShipBox.vue';
import DomainDashboardTotalKillsBox from './stats/DomainDashboardTotalKillsBox.vue';

interface Props {
    /** Domain identifier */
    domain: string;
    /** Time range for data */
    timeRange?: '1d' | '7d' | '14d' | '30d';
}

const props = withDefaults(defineProps<Props>(), {
    timeRange: '7d'
});
</script>

<style scoped>
.domain-dashboard-modular {
    /* Container styles */
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
}

/* Responsive grid adjustments */
@media (max-width: 768px) {
    .domain-dashboard-modular {
        padding: 0.5rem;
    }
}

/* Custom animations for the modular dashboard */
.domain-dashboard-modular>div {
    animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
