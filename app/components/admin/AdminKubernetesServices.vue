<template>
    <div class="kubernetes-services">
        <div class="services-header">
            <h3 class="services-title">{{ $t('admin.kubernetes.services.title') }}</h3>
            <UButton @click="refreshServices" :loading="loading">
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

        <div v-else-if="services.length === 0" class="empty-state">
            <UIcon name="heroicons:globe-alt" />
            {{ $t('admin.kubernetes.services.empty') }}
        </div>

        <div v-else class="services-table">
            <Table :columns="columns" :items="services" :loading="loading"
                :empty-text="$t('admin.kubernetes.services.empty')" empty-icon="lucide:globe" :skeleton-count="5">
                <!-- Name Column -->
                <template #cell-name="{ item }">
                    <span class="service-name">{{ (item as Service).metadata?.name }}</span>
                </template>

                <!-- Type Column -->
                <template #cell-type="{ item }">
                    <UBadge :label="item.spec?.type || 'Unknown'" />
                </template>

                <!-- Ports Column -->
                <template #cell-ports="{ item }">
                    <div class="ports-list">
                        <span v-for="port in item.spec?.ports" :key="port.port" class="port-item">
                            {{ port.port }}{{ port.protocol ? `/${port.protocol}` : '' }}
                        </span>
                    </div>
                </template>

                <!-- External IP Column -->
                <template #cell-externalIp="{ item }">
                    <span class="external-ip">
                        {{ getExternalIP(item) }}
                    </span>
                </template>

                <!-- Age Column -->
                <template #cell-age="{ item }">
                    <span class="age">{{ formatAge(item.metadata?.creationTimestamp) }}</span>
                </template>

                <!-- Mobile content -->
                <template #mobile-content="{ item }">
                    <div class="mobile-service-content">
                        <div class="mobile-service-header">
                            <span class="mobile-service-name">{{ item.metadata?.name }}</span>
                            <UBadge :label="item.spec?.type || 'Unknown'" />
                        </div>
                        <div class="mobile-service-details">
                            <div class="mobile-service-info">
                                <span class="label">Cluster IP:</span>
                                <span class="value">{{ item.spec?.clusterIP || 'None' }}</span>
                            </div>
                            <div class="mobile-service-info">
                                <span class="label">External IP:</span>
                                <span class="value">{{ getExternalIP(item) }}</span>
                            </div>
                            <div class="mobile-service-info">
                                <span class="label">Ports:</span>
                                <div class="ports-list">
                                    <span v-for="port in item.spec?.ports" :key="port.port" class="port-item">
                                        {{ port.port }}{{ port.protocol ? `/${port.protocol}` : '' }}
                                    </span>
                                </div>
                            </div>
                            <div class="mobile-service-info">
                                <span class="label">Age:</span>
                                <span class="value">{{ formatAge(item.metadata?.creationTimestamp) }}</span>
                            </div>
                        </div>
                    </div>
                </template>
            </Table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns';

interface Service {
    metadata?: {
        name?: string;
        namespace?: string;
        creationTimestamp?: string;
    };
    spec?: {
        type?: string;
        ports?: Array<{
            name?: string;
            port: number;
            targetPort?: number | string;
            protocol?: string;
        }>;
        clusterIP?: string;
        externalIPs?: string[];
        loadBalancerIP?: string;
    };
    status?: {
        loadBalancer?: {
            ingress?: Array<{
                ip?: string;
                hostname?: string;
            }>;
        };
    };
}

// Reactive data
const services = ref<Service[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Table columns
const columns = [
    {
        id: 'name',
        header: 'Name',
        width: '25%'
    },
    {
        id: 'type',
        header: 'Type',
        width: '15%'
    },
    {
        id: 'spec.clusterIP',
        header: 'Cluster IP',
        width: '20%'
    },
    {
        id: 'externalIp',
        header: 'External IP',
        width: '20%'
    },
    {
        id: 'ports',
        header: 'Ports',
        width: '15%'
    },
    {
        id: 'age',
        header: 'Age',
        width: '5%'
    }
];

// Methods
const fetchServices = async () => {
    try {
        loading.value = true;
        error.value = null;

        const data = await $fetch<Service[]>('/api/admin/kubernetes/services');
        services.value = data;
    } catch (err) {
        console.error('Failed to fetch services:', err);
        error.value = 'Failed to load services';
    } finally {
        loading.value = false;
    }
};

const refreshServices = () => {
    fetchServices();
};

const getExternalIP = (service: Service): string => {
    // Check load balancer ingress
    const lbIngress = service.status?.loadBalancer?.ingress;
    if (lbIngress && lbIngress.length > 0) {
        const ingress = lbIngress[0];
        return ingress.ip || ingress.hostname || 'Pending';
    }

    // Check external IPs
    if (service.spec?.externalIPs && service.spec.externalIPs.length > 0) {
        return service.spec.externalIPs.join(', ');
    }

    // Check load balancer IP
    if (service.spec?.loadBalancerIP) {
        return service.spec.loadBalancerIP;
    }

    return service.spec?.type === 'LoadBalancer' ? 'Pending' : 'None';
};

const formatAge = (timestamp?: string): string => {
    if (!timestamp) return 'Unknown';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

// Lifecycle
onMounted(() => {
    fetchServices();
});
</script>

<style scoped>
.kubernetes-services {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.services-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.services-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
}

.dark .services-title {
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

.ports-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
}

.port-item {
    background-color: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
}

.dark .port-item {
    background-color: #374151;
}

.external-ip {
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

/* Mobile service content styles */
.mobile-service-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.mobile-service-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mobile-service-name {
    font-weight: 600;
    color: #111827;
}

.dark .mobile-service-name {
    color: #ffffff;
}

.mobile-service-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.mobile-service-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.mobile-service-info .label {
    font-weight: 500;
    color: #6b7280;
    flex-shrink: 0;
    margin-right: 1rem;
}

.dark .mobile-service-info .label {
    color: #9ca3af;
}

.mobile-service-info .value {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875rem;
    text-align: right;
}
</style>
