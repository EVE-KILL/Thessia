<template>
    <div class="nav-item">
        <!-- Directory item -->
        <div v-if="item.type === 'directory'" class="nav-directory">
            <button @click="toggleExpanded" class="nav-directory-toggle" :class="{ 'expanded': isExpanded }">
                <Icon :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="nav-toggle-icon" />
                <Icon name="i-lucide-folder" class="nav-folder-icon" />
                <span class="nav-label">{{ formatName(item.name) }}</span>
            </button>

            <!-- Children -->
            <div v-if="isExpanded && item.children" class="nav-children">
                <DocsNavItem v-for="child in item.children" :key="child.path" :item="child" :current-path="currentPath"
                    @navigate="$emit('navigate', $event)" />
            </div>
        </div>

        <!-- File item -->
        <button v-else @click="$emit('navigate', item.path)" class="nav-file" :class="{ 'active': isActive }">
            <Icon name="i-lucide-file-text" class="nav-file-icon" />
            <span class="nav-label">{{ formatName(item.name) }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
interface DocFile {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: DocFile[];
}

interface Props {
    item: DocFile;
    currentPath: string;
}

interface Emits {
    navigate: [path: string];
}

const props = defineProps<Props>();
defineEmits<Emits>();

// Reactive state
const isExpanded = ref(false);

// Computed properties
const isActive = computed(() => {
    return props.currentPath === props.item.path;
});

const isChildActive = computed(() => {
    if (!props.item.children || !props.currentPath) return false;
    return props.item.children.some(child =>
        props.currentPath.startsWith(child.path)
    );
});

// Methods
const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value;
};

const formatName = (name: string) => {
    // Convert various naming conventions to readable format
    if (name === 'index') return 'Overview';

    // Convert kebab-case and snake_case to title case
    return name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
};

// Auto-expand if child is active
watch(() => props.currentPath, (newPath) => {
    if (props.item.type === 'directory' && props.item.children && newPath) {
        const hasActiveChild = props.item.children.some(child =>
            newPath === child.path || newPath.startsWith(child.path + '/')
        );
        if (hasActiveChild) {
            isExpanded.value = true;
        }
    }
}, { immediate: true });

// Initialize expansion state
onMounted(() => {
    if (isChildActive.value) {
        isExpanded.value = true;
    }
});
</script>

<style scoped>
.nav-item {
    font-size: 0.875rem;
}

.nav-directory {
    margin-bottom: 0.25rem;
}

.nav-directory-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: none;
    color: rgb(209, 213, 219);
    text-align: left;
    border-radius: 0.375rem;
    transition: all 0.2s;
    cursor: pointer;
}

.nav-directory-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
}

.nav-directory-toggle.expanded {
    color: white;
}

.nav-toggle-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    transition: transform 0.2s;
}

.nav-folder-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: rgb(251, 191, 36);
    /* Yellow for folders */
}

.nav-file {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: none;
    color: rgb(209, 213, 219);
    text-align: left;
    border-radius: 0.375rem;
    transition: all 0.2s;
    cursor: pointer;
    margin-bottom: 0.125rem;
}

.nav-file:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
}

.nav-file.active {
    background: rgba(59, 130, 246, 0.2);
    color: rgb(96, 165, 250);
}

.nav-file-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
}

.nav-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.nav-children {
    margin-left: 1.5rem;
    margin-top: 0.25rem;
    border-left: 1px solid rgb(75, 85, 99);
    padding-left: 0.75rem;
}

/* Nested children styling */
.nav-children .nav-item {
    position: relative;
}

.nav-children .nav-item::before {
    content: '';
    position: absolute;
    left: -0.75rem;
    top: 0.75rem;
    width: 0.75rem;
    height: 1px;
    background: rgb(75, 85, 99);
}
</style>
