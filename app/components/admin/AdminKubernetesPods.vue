<template>
    <div class="kubernetes-pods">
        <div class="pods-header">
            <h3 class="pods-title">{{ $t('admin.kubernetes.pods.title') }}</h3>
            <UButton @click="refreshPods" :loading="loading">
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

        <div v-else-if="pods.length === 0" class="empty-state">
            <UIcon name="heroicons:cube" />
            {{ $t('admin.kubernetes.pods.empty') }}
        </div>

        <div v-else class="pods-table">
            <Table :columns="columns" :items="pods" :loading="loading" :empty-text="$t('admin.kubernetes.pods.empty')"
                empty-icon="lucide:cube" :skeleton-count="5">
                <!-- Name Column -->
                <template #cell-name="{ item }">
                    <span class="pod-name">{{ (item as Pod).metadata?.name }}</span>
                </template>

                <!-- Status Column -->
                <!-- Status Column -->
                <template #cell-status="{ item }">
                    <UBadge :color="getStatusColor((item as Pod).status?.phase)"
                        :label="(item as Pod).status?.phase || 'Unknown'" />
                </template>

                <!-- Ready Column -->
                <template #cell-ready="{ item }">
                    <span class="ready-containers">
                        {{ getReadyContainers(item as Pod) }}/{{ getTotalContainers(item as Pod) }}
                    </span>
                </template>

                <!-- Restarts Column -->
                <template #cell-restarts="{ item }">
                    <span class="restart-count">{{ getRestartCount(item as Pod) }}</span>
                </template>

                <!-- Age Column -->
                <template #cell-age="{ item }">
                    <span class="age">{{ formatAge((item as Pod).metadata?.creationTimestamp) }}</span>
                </template>

                <!-- Actions Column -->
                <!-- Actions Column -->
                <template #cell-actions="{ item }">
                    <div class="actions">
                        <UButton size="sm" variant="ghost" color="blue" icon="lucide:file-text"
                            @click="showLogs(item as Pod)">
                            Logs
                        </UButton>
                        <UButton size="sm" variant="ghost" color="orange" icon="lucide:refresh-cw"
                            @click="restartPod(item as Pod)"
                            :loading="restartingPods.has((item as Pod).metadata?.name)">
                            Restart
                        </UButton>
                    </div>
                </template>

                <!-- Mobile content -->
                <template #mobile-content="{ item }">
                    <div class="mobile-pod-content">
                        <div class="mobile-pod-header">
                            <span class="mobile-pod-name">{{ (item as Pod).metadata?.name }}</span>
                            <UBadge :color="getStatusColor((item as Pod).status?.phase)"
                                :label="(item as Pod).status?.phase || 'Unknown'" />
                        </div>
                        <div class="mobile-pod-details">
                            <div class="mobile-pod-info">
                                <span class="label">Ready:</span>
                                <span class="value">{{ getReadyContainers(item as Pod) }}/{{ getTotalContainers(item as
                                    Pod) }}</span>
                            </div>
                            <div class="mobile-pod-info">
                                <span class="label">Restarts:</span>
                                <span class="value">{{ getRestartCount(item as Pod) }}</span>
                            </div>
                            <div class="mobile-pod-info">
                                <span class="label">Age:</span>
                                <span class="value">{{ formatAge((item as Pod).metadata?.creationTimestamp) }}</span>
                            </div>
                            <div class="mobile-pod-actions">
                                <UButton size="sm" variant="ghost" color="blue" icon="lucide:file-text"
                                    @click="showLogs(item as Pod)">
                                    Logs
                                </UButton>
                                <UButton size="sm" variant="ghost" color="orange" icon="lucide:refresh-cw"
                                    @click="restartPod(item as Pod)"
                                    :loading="restartingPods.has((item as Pod).metadata?.name)">
                                    Restart
                                </UButton>
                            </div>
                        </div>
                    </div>
                </template>
            </Table>
        </div>

        <!-- Logs Modal -->
        <Modal :is-open="logsModal.open" :title="$t('admin.kubernetes.pods.logsFor', { podName: logsModal.podName })"
            size="full" @close="logsModal.open = false">
            <div class="logs-content flex flex-col h-full">
                <div
                    class="logs-controls mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div class="flex flex-wrap items-end gap-4">
                        <div v-if="logsModal.containers.length > 1" class="flex-1 min-w-48">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {{ $t('admin.kubernetes.pods.container') }}
                            </label>
                            <select v-model="logsModal.selectedContainer" @change="onContainerChange"
                                class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option v-for="container in logsModal.containers" :key="container" :value="container">
                                    {{ container }}
                                </option>
                            </select>
                        </div>
                        <div class="flex-1 min-w-24">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Lines
                            </label>
                            <input v-model="logsModal.lines" type="number" min="10" max="1000"
                                @change="() => fetchLogs(logsModal.selectedContainer || undefined)"
                                class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <button @click="() => fetchLogs(logsModal.selectedContainer || undefined)"
                            :disabled="logsModal.loading"
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium transition-colors duration-200 flex items-center gap-2">
                            <UIcon name="heroicons:arrow-path" :class="{ 'animate-spin': logsModal.loading }" />
                            {{ $t('admin.kubernetes.refresh') }}
                        </button>
                    </div>
                </div>

                <div v-if="logsModal.loading"
                    class="flex items-center justify-center py-8 text-gray-600 dark:text-gray-400">
                    <UIcon name="heroicons:arrow-path" class="animate-spin mr-2" />
                    {{ $t('admin.kubernetes.pods.loadingLogs') }}
                </div>

                <div v-else-if="logsModal.error"
                    class="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                    <UIcon name="heroicons:exclamation-triangle" class="mr-2" />
                    {{ logsModal.error }}
                </div>

                <pre v-else class="bg-gray-900 text-green-400 p-4 rounded-lg
                    overflow-auto flex-1 text-sm font-mono whitespace-pre-wrap">{{ logsModal.content }}</pre>
            </div>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns';

interface Pod {
    metadata?: {
        name?: string;
        namespace?: string;
        creationTimestamp?: string;
    };
    spec?: {
        containers?: Array<{
            name: string;
            image: string;
        }>;
    };
    status?: {
        phase?: string;
        containerStatuses?: Array<{
            name: string;
            ready: boolean;
            restartCount: number;
            state?: {
                running?: any;
                waiting?: any;
                terminated?: any;
            };
        }>;
    };
}

// Props
const emit = defineEmits<{
    refresh: [];
}>();

// Reactive data
const pods = ref<Pod[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const restartingPods = ref(new Set<string>());

// Logs modal
const logsModal = ref({
    open: false,
    podName: '',
    pod: null as Pod | null,
    content: '',
    loading: false,
    error: null as string | null,
    lines: 100,
    selectedContainer: '',
    containers: [] as string[]
});

// Table columns
const columns = [
    {
        id: 'name',
        header: 'Name',
        width: '25%'
    },
    {
        id: 'status',
        header: 'Status',
        width: '15%'
    },
    {
        id: 'ready',
        header: 'Ready',
        width: '15%'
    },
    {
        id: 'restarts',
        header: 'Restarts',
        width: '15%'
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
const fetchPods = async () => {
    try {
        loading.value = true;
        error.value = null;

        const data = await $fetch<Pod[]>('/api/admin/kubernetes/pods');
        pods.value = data;
    } catch (err) {
        console.error('Failed to fetch pods:', err);
        error.value = 'Failed to load pods';
    } finally {
        loading.value = false;
    }
};

const refreshPods = () => {
    fetchPods();
    emit('refresh');
};

const getStatusColor = (phase?: string): string => {
    switch (phase?.toLowerCase()) {
        case 'running':
            return 'green';
        case 'pending':
            return 'yellow';
        case 'failed':
            return 'red';
        case 'succeeded':
            return 'blue';
        default:
            return 'gray';
    }
};

const getReadyContainers = (pod: Pod): number => {
    return pod.status?.containerStatuses?.filter(c => c.ready).length || 0;
};

const getTotalContainers = (pod: Pod): number => {
    return pod.status?.containerStatuses?.length || pod.spec?.containers?.length || 0;
};

const getRestartCount = (pod: Pod): number => {
    return pod.status?.containerStatuses?.reduce((sum, c) => sum + c.restartCount, 0) || 0;
};

const formatAge = (timestamp?: string): string => {
    if (!timestamp) return 'Unknown';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

const showLogs = async (pod: Pod) => {
    const podName = pod.metadata?.name;
    if (!podName) return;

    logsModal.value.open = true;
    logsModal.value.podName = podName;
    logsModal.value.pod = pod;
    logsModal.value.content = '';
    logsModal.value.error = null;

    // Extract container names from pod spec
    const containers = pod.spec?.containers?.map(c => c.name) || [];
    logsModal.value.containers = containers;

    // Default to first container if multiple, or empty if single
    logsModal.value.selectedContainer = containers.length > 1 ? containers[0] : '';

    // Fetch logs with container if needed
    await fetchLogs(logsModal.value.selectedContainer || undefined);
};

const fetchLogs = async (container?: string) => {
    try {
        logsModal.value.loading = true;
        logsModal.value.error = null;

        const query: any = {
            lines: logsModal.value.lines
        };

        // Add container parameter if specified (for multi-container pods)
        if (container) {
            query.container = container;
        }

        const { logs } = await $fetch(`/api/admin/kubernetes/pods/${logsModal.value.podName}/logs`, {
            query
        });

        logsModal.value.content = logs;
    } catch (err) {
        console.error('Failed to fetch logs:', err);
        logsModal.value.error = 'Failed to load logs';
    } finally {
        logsModal.value.loading = false;
    }
};

const onContainerChange = async () => {
    await fetchLogs(logsModal.value.selectedContainer || undefined);
};

const restartPod = async (pod: Pod) => {
    const podName = pod.metadata?.name;
    if (!podName) return;

    const confirmed = confirm(`Are you sure you want to restart pod "${podName}"?`);
    if (!confirmed) return;

    try {
        restartingPods.value.add(podName);

        await $fetch(`/api/admin/kubernetes/pods/${podName}/delete`, {
            method: 'POST'
        });

        // Refresh the pods list after a delay
        setTimeout(() => {
            refreshPods();
        }, 2000);
    } catch (err) {
        console.error('Failed to restart pod:', err);
        alert('Failed to restart pod');
    } finally {
        restartingPods.value.delete(podName);
    }
};

// Lifecycle
onMounted(() => {
    fetchPods();
});
</script>

<style scoped>
.kubernetes-pods {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.pods-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.pods-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
}

.dark .pods-title {
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

.ready-status,
.restart-count {
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

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-title {
    font-size: 1.125rem;
    font-weight: 600;
}

/* Mobile pod content styles */
.mobile-pod-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.mobile-pod-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mobile-pod-name {
    font-weight: 600;
    color: #111827;
}

.dark .mobile-pod-name {
    color: #ffffff;
}

.mobile-pod-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.mobile-pod-info {
    display: flex;
    justify-content: space-between;
}

.mobile-pod-info .label {
    font-weight: 500;
    color: #6b7280;
}

.dark .mobile-pod-info .label {
    color: #9ca3af;
}

.mobile-pod-info .value {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875rem;
}

.mobile-pod-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
}
</style>
