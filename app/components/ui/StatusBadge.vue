<template>
    <span class="status-badge" :class="statusClass">
        <UIcon :name="statusIcon" class="status-icon" />
        <span class="status-text">{{ statusLabel }}</span>
    </span>
</template>

<script setup lang="ts">
interface Props {
    status: 'active' | 'inactive' | 'unverified' | 'suspended';
}

const props = defineProps<Props>();

const statusConfig = {
    active: {
        class: 'status-active',
        icon: 'i-heroicons-check-circle',
        label: 'Active'
    },
    inactive: {
        class: 'status-inactive',
        icon: 'i-heroicons-pause-circle',
        label: 'Inactive'
    },
    unverified: {
        class: 'status-unverified',
        icon: 'i-heroicons-exclamation-triangle',
        label: 'Unverified'
    },
    suspended: {
        class: 'status-suspended',
        icon: 'i-heroicons-x-circle',
        label: 'Suspended'
    }
};

const statusClass = computed(() => statusConfig[props.status]?.class || statusConfig.inactive.class);
const statusIcon = computed(() => statusConfig[props.status]?.icon || statusConfig.inactive.icon);
const statusLabel = computed(() => statusConfig[props.status]?.label || 'Unknown');
</script>

<style scoped>
.status-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 500;
}

.status-icon {
    width: 12px;
    height: 12px;
}

.status-text {
    margin-left: 4px;
}

.status-active {
    background-color: #dcfce7;
    color: #166534;
}

.status-inactive {
    background-color: #f3f4f6;
    color: #374151;
}

.status-unverified {
    background-color: #fef3c7;
    color: #92400e;
}

.status-suspended {
    background-color: #fee2e2;
    color: #991b1b;
}

/* Dark mode styles */
.dark .status-active {
    background-color: rgba(34, 197, 94, 0.2);
    color: #86efac;
}

.dark .status-inactive {
    background-color: rgba(156, 163, 175, 0.2);
    color: #9ca3af;
}

.dark .status-unverified {
    background-color: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
}

.dark .status-suspended {
    background-color: rgba(239, 68, 68, 0.2);
    color: #f87171;
}
</style>
