<template>
    <button class="nav-item" :class="{
        'nav-item-active': isActive,
        'nav-item-child': isChild,
        'nav-item-expandable': hasChildren
    }" @click="$emit('navigate', item.path)">
        <Icon :name="item.icon" class="nav-item-icon" />
        <span class="nav-item-text">{{ item.name }}</span>
        <Icon v-if="hasChildren" :name="isExpanded ? 'heroicons:chevron-down' : 'heroicons:chevron-right'"
            class="nav-item-chevron" />
    </button>
</template>

<script setup lang="ts">
interface NavItem {
    name: string;
    path: string;
    icon: string;
}

interface Props {
    item: NavItem;
    currentPath: string;
    hasChildren?: boolean;
    isExpanded?: boolean;
    isChild?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    hasChildren: false,
    isExpanded: false,
    isChild: false,
});

defineEmits<{
    navigate: [path: string];
}>();

const isActive = computed(() => props.currentPath === props.item.path || props.currentPath.startsWith(props.item.path + '/'));
</script>

<style scoped>
.nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.625rem 0.75rem;
    text-align: left;
    border: none;
    border-radius: 0.375rem;
    background: none;
    color: rgb(209, 213, 219);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    margin-bottom: 0.125rem;
}

.nav-item:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
}

.nav-item-active {
    background: rgba(59, 130, 246, 0.2);
    color: rgb(96, 165, 250);
}

.nav-item-active:hover {
    background: rgba(59, 130, 246, 0.3);
    color: rgb(96, 165, 250);
}

.nav-item-child {
    padding-left: 2.5rem;
    font-size: 0.8125rem;
    color: rgb(156, 163, 175);
}

.nav-item-child:hover {
    color: rgb(209, 213, 219);
}

.nav-item-child.nav-item-active {
    color: rgb(96, 165, 250);
}

.nav-item-expandable {
    justify-content: space-between;
}

.nav-item-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    display: block;
}

.nav-item-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.nav-item-chevron {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
    transition: transform 0.2s ease-in-out;
}
</style>
