<template>
    <div class="kubernetes-admin">
        <div class="page-header">
            <h1 class="page-title">{{ $t('admin.kubernetes.title') }}</h1>
            <p class="page-description">{{ $t('admin.kubernetes.description') }}</p>
        </div>

        <!-- Cluster Overview -->
        <div class="overview-section">
            <div v-if="overviewLoading" class="loading-spinner">
                <UIcon name="heroicons:arrow-path" class="animate-spin" />
                {{ $t('admin.kubernetes.loading') }}
            </div>

            <div v-else-if="overviewError" class="error-message">
                <UIcon name="heroicons:exclamation-triangle" />
                {{ overviewError }}
            </div>

            <div v-else-if="overview" class="overview-grid">
                <!-- Resource Counts -->
                <div class="overview-card">
                    <h3>{{ $t('admin.kubernetes.overview.resources') }}</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">{{ $t('admin.kubernetes.pods.title') }}</span>
                            <span class="stat-value">{{ overview.counts.pods }}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">{{ $t('admin.kubernetes.deployments.title') }}</span>
                            <span class="stat-value">{{ overview.counts.deployments }}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">{{ $t('admin.kubernetes.services.title') }}</span>
                            <span class="stat-value">{{ overview.counts.services }}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">{{ $t('admin.kubernetes.ingresses.title') }}</span>
                            <span class="stat-value">{{ overview.counts.ingresses }}</span>
                        </div>
                    </div>
                </div>

                <!-- Pod Status -->
                <div class="overview-card">
                    <h3>{{ $t('admin.kubernetes.overview.podStatus') }}</h3>
                    <div class="status-grid">
                        <div v-for="(count, status) in overview.podStatusCounts" :key="status" class="status-item"
                            :class="`status-${status.toLowerCase()}`">
                            <span class="status-label">{{ status }}</span>
                            <span class="status-count">{{ count }}</span>
                        </div>
                    </div>
                </div>

                <!-- Deployment Health -->
                <div class="overview-card">
                    <h3>{{ $t('admin.kubernetes.overview.deploymentHealth') }}</h3>
                    <div class="health-grid">
                        <div v-for="(count, health) in overview.deploymentStatusCounts" :key="health"
                            class="health-item" :class="`health-${health}`">
                            <span class="health-label">{{ health }}</span>
                            <span class="health-count">{{ count }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs for Different Resources -->
        <div class="resources-section">
            <Tabs v-model="selectedTabId" :items="tabs">
                <!-- Pods Tab -->
                <template #pods>
                    <AdminKubernetesPods @refresh="refreshOverview" />
                </template>

                <!-- Deployments Tab -->
                <template #deployments>
                    <AdminKubernetesDeployments @refresh="refreshOverview" />
                </template>

                <!-- Services Tab -->
                <template #services>
                    <AdminKubernetesServices />
                </template>

                <!-- Ingresses Tab -->
                <template #ingresses>
                    <AdminKubernetesIngresses />
                </template>
            </Tabs>
        </div>
    </div>
</template>

<script setup lang="ts">
interface ClusterOverview {
    namespace: string;
    counts: {
        pods: number;
        deployments: number;
        services: number;
        ingresses: number;
        hpas: number;
        pvcs: number;
        jobs: number;
        cronJobs: number;
    };
    podStatusCounts: Record<string, number>;
    deploymentStatusCounts: Record<string, number>;
}

// Reactive data
const overview = ref<ClusterOverview | null>(null);
const overviewLoading = ref(true);
const overviewError = ref<string | null>(null);
const selectedTabId = ref('pods');

// Tab configuration
const tabs = [
    {
        id: 'pods',
        label: 'Pods',
        icon: 'heroicons:cube',
        slot: 'pods'
    },
    {
        id: 'deployments',
        label: 'Deployments',
        icon: 'heroicons:squares-2x2',
        slot: 'deployments'
    },
    {
        id: 'services',
        label: 'Services',
        icon: 'heroicons:globe-alt',
        slot: 'services'
    },
    {
        id: 'ingresses',
        label: 'Ingresses',
        icon: 'heroicons:arrow-top-right-on-square',
        slot: 'ingresses'
    }
];

// Methods
const fetchOverview = async () => {
    try {
        overviewLoading.value = true;
        overviewError.value = null;

        const data = await $fetch<ClusterOverview>('/api/admin/kubernetes/overview');
        overview.value = data;
    } catch (error) {
        console.error('Failed to fetch cluster overview:', error);
        overviewError.value = 'Failed to load cluster overview';
    } finally {
        overviewLoading.value = false;
    }
};

const refreshOverview = () => {
    fetchOverview();
};

// Lifecycle
onMounted(() => {
    fetchOverview();
});
</script>

<style scoped>
.kubernetes-admin {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.page-header {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 1rem;
}

.dark .page-header {
    border-bottom-color: #374151;
}

.page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
}

.dark .page-title {
    color: #ffffff;
}

.page-description {
    color: #6b7280;
    margin-top: 0.5rem;
}

.dark .page-description {
    color: #9ca3af;
}

.section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 1rem;
}

.dark .section-title {
    color: #ffffff;
}

.loading-spinner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6b7280;
}

.dark .loading-spinner {
    color: #9ca3af;
}

.error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #dc2626;
    background-color: #fef2f2;
    padding: 1rem;
    border-radius: 0.375rem;
}

.dark .error-message {
    color: #f87171;
    background-color: rgba(127, 29, 29, 0.2);
}

.overview-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
}

@media (min-width: 768px) {
    .overview-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 1024px) {
    .overview-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

.overview-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    padding: 1.5rem;
}

.dark .overview-card {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgb(55, 55, 55);
}

.overview-card h3 {
    font-size: 1rem;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 1rem;
}

.dark .overview-card h3 {
    color: white;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

.stat-item {
    text-align: center;
}

.stat-label {
    display: block;
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

.dark .stat-label {
    color: rgb(156, 163, 175);
}

.stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 600;
    color: #6b7280;
}

.dark .stat-value {
    color: white;
}

.status-grid,
.health-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.status-item,
.health-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-radius: 0.375rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
}

.status-running {
    background: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.3);
    color: rgb(34, 197, 94);
}

.dark .status-running {
    background: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.3);
    color: rgb(34, 197, 94);
}

.status-pending {
    background: rgba(234, 179, 8, 0.2);
    border-color: rgba(234, 179, 8, 0.3);
    color: rgb(234, 179, 8);
}

.dark .status-pending {
    background: rgba(234, 179, 8, 0.2);
    border-color: rgba(234, 179, 8, 0.3);
    color: rgb(234, 179, 8);
}

.status-failed {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    color: rgb(239, 68, 68);
}

.dark .status-failed {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    color: rgb(239, 68, 68);
}

.status-unknown {
    background: rgba(156, 163, 175, 0.2);
    border-color: rgba(156, 163, 175, 0.3);
    color: rgb(156, 163, 175);
}

.dark .status-unknown {
    background: rgba(156, 163, 175, 0.2);
    border-color: rgba(156, 163, 175, 0.3);
    color: rgb(156, 163, 175);
}

.health-healthy {
    background: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.3);
    color: rgb(34, 197, 94);
}

.dark .health-healthy {
    background: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.3);
    color: rgb(34, 197, 94);
}

.health-unhealthy {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    color: rgb(239, 68, 68);
}

.dark .health-unhealthy {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    color: rgb(239, 68, 68);
}

.resources-section {
    margin-top: 2rem;
}
</style>
