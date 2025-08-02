<template>
    <div class="kubernetes-deployments">
        <div class="deployments-header">
            <h3 class="deployments-title">{{ $t('admin.kubernetes.deployments.title') }}</h3>
            <UButton @click="refreshDeployments" :loading="loading">
                <UIcon name="heroicons:arrow-path" />
                {{ $t('admin.kubernetes.refresh') }}
            </UButton>
        </div>

        <div v-if="loading" class="loading-state">
            <UIcon name="heroicons:arrow-path" class="animate-spin" />
            {{ $t('admin.kubernetes.loading') }}
        </div>

        <div v-else-if="error" class="error-state">
            <UIcon name="heroicons:exclamation-triangle" />
            {{ error }}
        </div>

        <div v-else-if="deployments.length === 0" class="empty-state">
            <UIcon name="heroicons:squares-2x2" />
            {{ $t('admin.kubernetes.deployments.empty') }}
        </div>

        <div v-else class="deployments-table">
            <Table :columns="columns" :items="deployments" :loading="loading"
                :empty-text="$t('admin.kubernetes.deployments.empty')" empty-icon="lucide:squares-2x2"
                :skeleton-count="5">
                <!-- Name Column -->
                <template #cell-name="{ item }">
                    <span class="deployment-name">{{ (item as Deployment).metadata?.name }}</span>
                </template>

                <!-- Replicas Column -->
                <template #cell-replicas="{ item }">
                    <span class="replicas-status">
                        {{ item.status?.readyReplicas || 0 }}/{{ item.spec?.replicas || 0 }}
                    </span>
                </template>

                <!-- Status Column -->
                <template #cell-status="{ item }">
                    <UBadge :color="getDeploymentStatusColor(item)" :label="getDeploymentStatus(item)" />
                </template>

                <!-- Age Column -->
                <template #cell-age="{ item }">
                    <span class="age">{{ formatAge(item.metadata?.creationTimestamp) }}</span>
                </template>

                <!-- Actions Column -->
                <template #cell-actions="{ item }">
                    <div class="actions-container">
                        <UButton size="xs" color="blue" variant="outline" @click="scaleDeployment(item)">
                            <UIcon name="heroicons:adjustments-horizontal" />
                            {{ $t('admin.kubernetes.deployments.scale') }}
                        </UButton>
                    </div>
                </template>

                <!-- Mobile content -->
                <template #mobile-content="{ item }">
                    <div class="mobile-deployment-content">
                        <div class="mobile-deployment-header">
                            <span class="mobile-deployment-name">{{ item.metadata?.name }}</span>
                            <UBadge :color="getDeploymentStatusColor(item)" :label="getDeploymentStatus(item)" />
                        </div>
                        <div class="mobile-deployment-details">
                            <div class="mobile-deployment-info">
                                <span class="label">Replicas:</span>
                                <span class="value">{{ item.status?.readyReplicas || 0 }}/{{ item.spec?.replicas || 0
                                    }}</span>
                            </div>
                            <div class="mobile-deployment-info">
                                <span class="label">Age:</span>
                                <span class="value">{{ formatAge(item.metadata?.creationTimestamp) }}</span>
                            </div>
                        </div>
                        <div class="mobile-deployment-actions">
                            <UButton size="xs" color="blue" variant="outline" @click="scaleDeployment(item)">
                                <UIcon name="heroicons:adjustments-horizontal" />
                                {{ $t('admin.kubernetes.deployments.scale') }}
                            </UButton>
                        </div>
                    </div>
                </template>
            </Table>
        </div>

        <!-- Scale Modal -->
        <Modal :is-open="scaleModal.open"
            :title="$t('admin.kubernetes.deployments.scaleTitle', { deploymentName: scaleModal.deploymentName })"
            size="md" @close="scaleModal.open = false">
            <div class="scale-content">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {{ $t('admin.kubernetes.deployments.currentReplicas') }}
                    </label>
                    <input :value="scaleModal.currentReplicas" readonly
                        class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100 cursor-not-allowed" />
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {{ $t('admin.kubernetes.deployments.newReplicas') }}
                    </label>
                    <input v-model="scaleModal.newReplicas" type="number" min="0" max="50"
                        class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div class="scale-actions flex gap-3 justify-end">
                    <button @click="scaleModal.open = false"
                        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 rounded-md font-medium transition-colors duration-200">
                        {{ $t('admin.kubernetes.cancel') }}
                    </button>
                    <button @click="confirmScale"
                        :disabled="scaleModal.loading || scaleModal.newReplicas === scaleModal.currentReplicas"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium transition-colors duration-200 flex items-center gap-2">
                        <UIcon v-if="scaleModal.loading" name="heroicons:arrow-path" class="animate-spin" />
                        {{ $t('admin.kubernetes.deployments.scale') }}
                    </button>
                </div>
            </div>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns';

interface Deployment {
    metadata?: {
        name?: string;
        namespace?: string;
        creationTimestamp?: string;
    };
    spec?: {
        replicas?: number;
        selector?: {
            matchLabels?: Record<string, string>;
        };
    };
    status?: {
        replicas?: number;
        readyReplicas?: number;
        availableReplicas?: number;
        unavailableReplicas?: number;
        conditions?: Array<{
            type: string;
            status: string;
            reason?: string;
            message?: string;
        }>;
    };
}

// Props
const emit = defineEmits<{
    refresh: [];
}>();

// Reactive data
const deployments = ref<Deployment[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Scale modal
const scaleModal = ref({
    open: false,
    deploymentName: '',
    currentReplicas: 0,
    newReplicas: 0,
    loading: false
});

// Table columns
const columns = [
    {
        id: 'name',
        header: 'Name',
        width: '30%'
    },
    {
        id: 'replicas',
        header: 'Replicas',
        width: '20%'
    },
    {
        id: 'status',
        header: 'Status',
        width: '20%'
    },
    {
        id: 'age',
        header: 'Age',
        width: '15%'
    },
    {
        id: 'actions',
        header: 'Actions',
        width: '15%'
    }
];

// Methods
const fetchDeployments = async () => {
    try {
        loading.value = true;
        error.value = null;

        const data = await $fetch<Deployment[]>('/api/admin/kubernetes/deployments');
        deployments.value = data;
    } catch (err) {
        console.error('Failed to fetch deployments:', err);
        error.value = 'Failed to load deployments';
    } finally {
        loading.value = false;
    }
};

const refreshDeployments = () => {
    fetchDeployments();
    emit('refresh');
};

const getDeploymentStatus = (deployment: Deployment): string => {
    const desired = deployment.spec?.replicas || 0;
    const ready = deployment.status?.readyReplicas || 0;

    if (ready === desired && desired > 0) {
        return 'Ready';
    } else if (ready === 0) {
        return 'Not Ready';
    } else {
        return 'Updating';
    }
};

const getDeploymentStatusColor = (deployment: Deployment): string => {
    const status = getDeploymentStatus(deployment);
    switch (status) {
        case 'Ready':
            return 'green';
        case 'Not Ready':
            return 'red';
        case 'Updating':
            return 'yellow';
        default:
            return 'gray';
    }
};

const formatAge = (timestamp?: string): string => {
    if (!timestamp) return 'Unknown';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

const scaleDeployment = (deployment: Deployment) => {
    const deploymentName = deployment.metadata?.name;
    if (!deploymentName) return;

    scaleModal.value.open = true;
    scaleModal.value.deploymentName = deploymentName;
    scaleModal.value.currentReplicas = deployment.spec?.replicas || 0;
    scaleModal.value.newReplicas = deployment.spec?.replicas || 0;
};

const confirmScale = async () => {
    try {
        scaleModal.value.loading = true;

        await $fetch(`/api/admin/kubernetes/deployments/${scaleModal.value.deploymentName}/scale`, {
            method: 'POST',
            body: {
                replicas: scaleModal.value.newReplicas
            }
        });

        scaleModal.value.open = false;
        refreshDeployments();
    } catch (err) {
        console.error('Failed to scale deployment:', err);
        alert('Failed to scale deployment');
    } finally {
        scaleModal.value.loading = false;
    }
};

// Lifecycle
onMounted(() => {
    fetchDeployments();
});
</script>

<style scoped>
.kubernetes-deployments {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.deployments-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.deployments-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
}

.dark .deployments-title {
    color: #ffffff;
}

.loading-state,
.error-state,
.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem 0;
    color: #6b7280;
}

.dark .loading-state,
.dark .error-state,
.dark .empty-state {
    color: #9ca3af;
}

.error-state {
    color: #dc2626;
}

.dark .error-state {
    color: #f87171;
}

.replicas-status {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875rem;
}

.age {
    font-size: 0.875rem;
    color: #6b7280;
}

.dark .age {
    color: #9ca3af;
}

.actions-container {
    display: flex;
    gap: 0.5rem;
}

.scale-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* Mobile deployment content styles */
.mobile-deployment-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.mobile-deployment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mobile-deployment-name {
    font-weight: 600;
    color: #111827;
}

.dark .mobile-deployment-name {
    color: #ffffff;
}

.mobile-deployment-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.mobile-deployment-info {
    display: flex;
    justify-content: space-between;
}

.mobile-deployment-info .label {
    font-weight: 500;
    color: #6b7280;
}

.dark .mobile-deployment-info .label {
    color: #9ca3af;
}

.mobile-deployment-info .value {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875rem;
}

.mobile-deployment-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
}
</style>
