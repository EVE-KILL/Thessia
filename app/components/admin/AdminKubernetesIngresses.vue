<template>
    <div class="kubernetes-ingresses">
        <div class="ingresses-header">
            <h3 class="ingresses-title">{{ $t('admin.kubernetes.ingresses.title') }}</h3>
            <UButton @click="refreshIngresses" :loading="loading">
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

        <div v-else-if="ingresses.length === 0" class="empty-state">
            <UIcon name="heroicons:arrow-top-right-on-square" />
            {{ $t('admin.kubernetes.ingresses.empty') }}
        </div>

        <div v-else class="ingresses-table">
            <Table :columns="columns" :items="ingresses" :loading="loading"
                :empty-text="$t('admin.kubernetes.ingresses.empty')" empty-icon="lucide:external-link"
                :skeleton-count="5">
                <!-- Name Column -->
                <template #cell-name="{ item }">
                    <span class="ingress-name">{{ (item as Ingress).metadata?.name }}</span>
                </template>

                <!-- Class Column -->
                <template #cell-class="{ item }">
                    <span class="ingress-class">{{ (item as Ingress).spec?.ingressClassName || 'default' }}</span>
                </template>

                <!-- Hosts Column -->
                <template #cell-hosts="{ item }">
                    <div class="hosts-list">
                        <span v-for="host in getHosts(item as Ingress)" :key="host" class="host-item">
                            {{ host }}
                        </span>
                    </div>
                </template>

                <!-- Paths Column -->
                <template #cell-paths="{ item }">
                    <div class="paths-list">
                        <span v-for="path in getPaths(item as Ingress)" :key="path" class="path-item">
                            {{ path }}
                        </span>
                    </div>
                </template>

                <!-- Age Column -->
                <template #cell-age="{ item }">
                    <span class="age">{{ formatAge((item as Ingress).metadata?.creationTimestamp) }}</span>
                </template>

                <!-- Mobile content -->
                <template #mobile-content="{ item }">
                    <div class="mobile-ingress-content">
                        <div class="mobile-ingress-header">
                            <span class="mobile-ingress-name">{{ (item as Ingress).metadata?.name }}</span>
                            <span class="mobile-ingress-class">{{ (item as Ingress).spec?.ingressClassName || 'default'
                                }}</span>
                        </div>
                        <div class="mobile-ingress-details">
                            <div class="mobile-ingress-info">
                                <span class="label">Hosts:</span>
                                <div class="hosts-list">
                                    <span v-for="host in getHosts(item as Ingress)" :key="host" class="host-item">
                                        {{ host }}
                                    </span>
                                </div>
                            </div>
                            <div class="mobile-ingress-info">
                                <span class="label">Paths:</span>
                                <div class="paths-list">
                                    <span v-for="path in getPaths(item as Ingress)" :key="path" class="path-item">
                                        {{ path }}
                                    </span>
                                </div>
                            </div>
                            <div class="mobile-ingress-info">
                                <span class="label">Age:</span>
                                <span class="value">{{ formatAge((item as Ingress).metadata?.creationTimestamp)
                                    }}</span>
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

const { t } = useI18n();

interface Ingress {
    metadata?: {
        name?: string;
        namespace?: string;
        creationTimestamp?: string;
    };
    spec?: {
        ingressClassName?: string;
        rules?: Array<{
            host?: string;
            http?: {
                paths?: Array<{
                    path?: string;
                    pathType?: string;
                    backend?: {
                        service?: {
                            name?: string;
                            port?: {
                                number?: number;
                                name?: string;
                            };
                        };
                    };
                }>;
            };
        }>;
        tls?: Array<{
            secretName?: string;
            hosts?: string[];
        }>;
    };
}

// Reactive data
const ingresses = ref<Ingress[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Table columns
const columns = [
    { id: 'name', header: t('admin.kubernetes.ingresses.columns.name'), width: '25%' },
    { id: 'class', header: t('admin.kubernetes.ingresses.columns.class'), width: '20%' },
    { id: 'hosts', header: t('admin.kubernetes.ingresses.columns.hosts'), width: '25%' },
    { id: 'paths', header: t('admin.kubernetes.ingresses.columns.paths'), width: '20%' },
    { id: 'age', header: t('admin.kubernetes.ingresses.columns.age'), width: '10%' }
];

// Methods
const fetchIngresses = async () => {
    try {
        loading.value = true;
        error.value = null;

        const data = await $fetch<Ingress[]>('/api/admin/kubernetes/ingresses');
        ingresses.value = data;
    } catch (err) {
        console.error('Failed to fetch ingresses:', err);
        error.value = 'Failed to load ingresses';
    } finally {
        loading.value = false;
    }
};

const refreshIngresses = () => {
    fetchIngresses();
};

const getHosts = (ingress: Ingress): string[] => {
    if (!ingress.spec?.rules) return [];

    return ingress.spec.rules
        .map(rule => rule.host)
        .filter((host): host is string => !!host);
};

const getPaths = (ingress: Ingress): string[] => {
    if (!ingress.spec?.rules) return [];

    const paths: string[] = [];

    for (const rule of ingress.spec.rules) {
        if (rule.http?.paths) {
            for (const path of rule.http.paths) {
                if (path.path) {
                    paths.push(path.path);
                }
            }
        }
    }

    return paths.length > 0 ? paths : ['/'];
};

const formatAge = (timestamp?: string): string => {
    if (!timestamp) return 'Unknown';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

// Lifecycle
onMounted(() => {
    fetchIngresses();
});
</script>

<style scoped>
.kubernetes-ingresses {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.ingresses-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.ingresses-title {
    font-size: 18px;
    font-weight: 600;
    color: rgb(17 24 39);
}

.dark .ingresses-title {
    color: rgb(255 255 255);
}

.loading-state,
.error-state,
.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 32px;
    color: rgb(75 85 99);
}

.dark .loading-state,
.dark .error-state,
.dark .empty-state {
    color: rgb(156 163 175);
}

.error-state {
    color: rgb(220 38 38);
}

.dark .error-state {
    color: rgb(248 113 113);
}

.hosts-list,
.paths-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.host-item,
.path-item {
    background-color: rgb(219 234 254);
    color: rgb(30 64 175);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
}

.dark .host-item,
.dark .path-item {
    background-color: rgba(30, 64, 175, 0.2);
    color: rgb(96 165 250);
}

.age {
    font-size: 14px;
    color: rgb(75 85 99);
}

.dark .age {
    color: rgb(156 163 175);
}
</style>
