<template>
    <div class="docs-container">
        <!-- Page Header -->
        <div class="docs-header">
            <h1 class="text-3xl font-bold text-white mb-2">
                {{ t('docs.title') }}
            </h1>
            <p class="text-background-300">
                {{ t('docs.description') }}
            </p>
        </div>

        <!-- Main Content Area -->
        <div class="docs-content">
            <!-- Sidebar (20%) -->
            <aside class="docs-sidebar">
                <nav class="docs-nav">
                    <h2 class="nav-title">{{ t('docs.navigation') }}</h2>

                    <!-- Loading state -->
                    <div v-if="structurePending" class="nav-loading">
                        <div v-for="i in 8" :key="i" class="nav-skeleton">
                            <USkeleton class="h-4 w-full" />
                        </div>
                    </div>

                    <!-- Error state -->
                    <div v-else-if="structureError" class="nav-error">
                        <p class="text-red-400 text-sm">
                            {{ t('docs.navigationError') }}
                        </p>
                    </div>

                    <!-- Navigation tree -->
                    <div v-else class="nav-tree">
                        <DocsNavItem v-for="item in docsStructure" :key="item.path" :item="item"
                            :current-path="currentPath" @navigate="handleNavigation" />
                    </div>
                </nav>
            </aside>

            <!-- Content Area (80%) -->
            <main class="docs-main">
                <!-- Loading state -->
                <div v-if="contentPending" class="content-loading">
                    <USkeleton class="h-8 w-64 mb-4" />
                    <USkeleton class="h-4 w-full mb-2" />
                    <USkeleton class="h-4 w-full mb-2" />
                    <USkeleton class="h-4 w-3/4 mb-4" />
                    <USkeleton class="h-6 w-48 mb-3" />
                    <USkeleton class="h-4 w-full mb-2" />
                    <USkeleton class="h-4 w-5/6" />
                </div>

                <!-- Error state -->
                <div v-else-if="contentError" class="content-error">
                    <div class="error-container">
                        <Icon name="i-lucide-file-x" class="error-icon" />
                        <h2 class="text-xl font-semibold text-white mb-2">
                            {{ t('docs.contentError') }}
                        </h2>
                        <p class="text-background-300 mb-4">
                            {{ contentError.message || t('docs.contentErrorMessage') }}
                        </p>
                        <UButton @click="() => refreshContent()" variant="outline" size="sm">
                            {{ t('docs.retry') }}
                        </UButton>
                    </div>
                </div>

                <!-- Content -->
                <div v-else-if="currentDoc" class="content-container">
                    <!-- Breadcrumb -->
                    <nav v-if="breadcrumbs.length > 0" class="breadcrumb">
                        <NuxtLink v-for="(crumb, index) in breadcrumbs" :key="crumb.path" :to="`/docs/${crumb.path}`"
                            class="breadcrumb-item" :class="{ 'active': index === breadcrumbs.length - 1 }">
                            {{ crumb.name }}
                        </NuxtLink>
                    </nav>

                    <!-- Rendered Markdown Content -->
                    <div v-if="renderedContent" class="enhanced-markdown" v-html="renderedContent" />
                    <!-- Loading state for client-side rendering -->
                    <div v-else class="content-loading">
                        <USkeleton class="h-4 w-full mb-2" />
                        <USkeleton class="h-4 w-full mb-2" />
                        <USkeleton class="h-4 w-3/4 mb-4" />
                    </div>
                </div>

                <!-- Welcome state -->
                <div v-else class="welcome-state">
                    <div class="welcome-container">
                        <Icon name="i-lucide-book-open" class="welcome-icon" />
                        <h2 class="text-2xl font-semibold text-white mb-3">
                            {{ t('docs.welcome') }}
                        </h2>
                        <p class="text-background-300 mb-4">
                            {{ t('docs.welcomeMessage') }}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<script setup lang="ts">
import DOMPurify from 'isomorphic-dompurify';
import '~/assets/css/enhanced-markdown.css';

interface DocFile {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: DocFile[];
}

interface DocContent {
    content: string;
    path: string;
    exists: boolean;
}

interface BreadcrumbItem {
    name: string;
    path: string;
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { renderMarkdown } = useEnhancedMarkdown();

// SEO Meta
useSeoMeta({
    title: t('docs.title'),
    description: t('docs.description'),
    ogTitle: t('docs.title'),
    ogDescription: t('docs.description'),
});

// Initialize currentDocPath from route immediately
const getCurrentDocPath = () => {
    try {
        if (route.params.path) {
            if (Array.isArray(route.params.path)) {
                const joined = route.params.path.join('/');
                return joined || 'index';
            } else if (typeof route.params.path === 'string') {
                return route.params.path;
            }
        }
    } catch (error) {
        console.warn('Error getting current doc path:', error);
    }
    return 'index';
};

const currentDocPath = ref<string>(getCurrentDocPath());

// Fetch documentation structure using useFetch for better SSR handling
const {
    data: structureData,
    pending: structurePending,
    error: structureError,
    refresh: refreshStructure
} = await useFetch<{ structure: DocFile[]; error: string | null }>(
    () => {
        // Add cache busting only in development
        const isDev = process.env.NODE_ENV === 'development';
        return isDev
            ? `/api/docs/structure?_t=${Date.now()}`
            : '/api/docs/structure';
    },
    {
        key: 'docs-structure',
        server: true, // Ensure this runs on the server
        lazy: false, // Don't delay the initial render
        default: () => ({ structure: [], error: null }),
    }
);

const docsStructure = computed(() => structureData.value?.structure || []);

// Computed current path for reactive navigation
const currentPath = computed(() => currentDocPath.value || 'index');

// Fetch current document content using useFetch for better SSR handling
const {
    data: currentDoc,
    pending: contentPending,
    error: contentError,
    refresh: refreshContent
} = await useFetch<DocContent | null>(
    () => {
        const path = currentDocPath.value || 'index';
        // Add cache busting only in development
        const isDev = process.env.NODE_ENV === 'development';
        return isDev
            ? `/api/docs/content/${path}?_t=${Date.now()}`
            : `/api/docs/content/${path}`;
    },
    {
        key: () => `doc-content-${currentDocPath.value || 'index'}`,
        server: true, // Ensure this runs on the server
        lazy: false, // Don't delay the initial render
        default: () => null,
        watch: [currentDocPath], // Re-fetch when currentDocPath changes
    }
);

// Client-side only markdown rendering to avoid SSR hydration issues
const renderedContent = ref('');

// Render markdown on client-side only
onMounted(() => {
    const updateRenderedContent = async () => {
        if (!currentDoc.value?.content) {
            renderedContent.value = '';
            return;
        }

        try {
            // Use enhanced markdown renderer with docs-specific features
            renderedContent.value = await renderMarkdown(currentDoc.value.content, {
                currentPath: currentDocPath.value,
                allowDiagrams: true,
                allowHtml: true
            });
        } catch (error) {
            console.error('Error rendering markdown for', currentDocPath.value, ':', error);
            renderedContent.value = DOMPurify.sanitize(`<div class="error">Failed to render content: ${error.message}</div>`);
        }
    };

    // Initial render
    updateRenderedContent();

    // Watch for content changes
    watch([currentDoc, currentDocPath], () => updateRenderedContent(), { immediate: false });
});

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    if (!currentDocPath.value) return [];

    const parts = currentDocPath.value.split('/');
    const crumbs: BreadcrumbItem[] = [];

    for (let i = 0; i < parts.length; i++) {
        const path = parts.slice(0, i + 1).join('/');
        const name = parts[i];

        crumbs.push({
            name: name === 'index' ? (t('docs.home') || 'Home') : (name || 'Unknown'),
            path
        });
    }

    return crumbs;
});

// Methods
const handleNavigation = async (path: string) => {
    if (path === currentDocPath.value) return;

    console.log('Navigation triggered to:', path);

    // Update the path first
    currentDocPath.value = path;

    // Navigate to the new route
    await router.push(`/docs/${path}`);

    // The useFetch will automatically re-fetch due to the watch on currentDocPath
};

// Handle clicks on internal docs links
const handleInternalLinkClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('.internal-docs-link') as HTMLAnchorElement;

    if (link) {
        // Check for modifier keys (allow opening in new tab/window)
        const mouseEvent = event as MouseEvent;
        if (mouseEvent.ctrlKey || mouseEvent.metaKey || mouseEvent.shiftKey || mouseEvent.button === 1) {
            return; // Let browser handle modified clicks
        }

        event.preventDefault();
        const docsPath = link.dataset.docsPath;
        if (docsPath) {
            handleNavigation(docsPath);
        }
    }
};// Route watching - update path when route changes
watch(() => route.params.path, async (newPath) => {
    let newDocPath = '';
    if (Array.isArray(newPath)) {
        newDocPath = newPath.join('/');
    } else if (newPath) {
        newDocPath = newPath;
    } else {
        newDocPath = 'index';
    }

    // Only update if path actually changed
    if (newDocPath !== currentDocPath.value) {
        console.log('Route changed, updating path from:', currentDocPath.value, 'to:', newDocPath);
        currentDocPath.value = newDocPath;

        // The useFetch will automatically re-fetch due to the watch on currentDocPath
    }
}, { immediate: true });

// Also watch the full route path to catch any changes
watch(() => route.fullPath, (newPath) => {
    // Extract the docs path from the full path
    const docsMatch = newPath.match(/^\/docs\/(.+)$/);
    if (docsMatch) {
        const extractedPath = docsMatch[1];
        if (extractedPath !== currentDocPath.value) {
            console.log('Full path changed, updating currentDocPath to:', extractedPath);
            currentDocPath.value = extractedPath;
        }
    } else if (newPath === '/docs' || newPath === '/docs/') {
        if (currentDocPath.value !== 'index') {
            console.log('Navigation to docs root, setting to index');
            currentDocPath.value = 'index';
        }
    }
});

// Initialize - no longer needed since we initialize currentDocPath from route immediately
onMounted(() => {
    // Add click handler for internal docs links
    document.addEventListener('click', handleInternalLinkClick);
});

// Cleanup
onUnmounted(() => {
    document.removeEventListener('click', handleInternalLinkClick);
});
</script>

<style scoped>
.docs-container {
    min-height: 100vh;
    padding: 1rem;
}

.docs-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

.docs-content {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 2rem;
    min-height: calc(100vh - 200px);
}

/* Sidebar Styles */
.docs-sidebar {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 0.5rem;
    padding: 1.5rem;
    height: fit-content;
    position: sticky;
    top: 1rem;
}

.nav-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

.nav-loading {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.nav-skeleton {
    height: 1rem;
}

.nav-error {
    padding: 1rem;
    text-align: center;
}

.nav-tree {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

/* Main Content Styles */
.docs-main {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 0.5rem;
    padding: 2rem;
    min-height: 500px;
    overflow-x: hidden;
    word-wrap: break-word;
    overflow-wrap: break-word;
}

.content-loading {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.content-error,
.welcome-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
}

.error-container,
.welcome-container {
    text-align: center;
    max-width: 400px;
}

.error-icon,
.welcome-icon {
    width: 4rem;
    height: 4rem;
    color: rgb(156, 163, 175);
    margin: 0 auto 1rem auto;
}

.content-container {
    max-width: none;
    overflow-x: hidden;
    word-wrap: break-word;
    overflow-wrap: break-word;
}

/* Breadcrumb Styles */
.breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(55, 55, 55);
    font-size: 0.875rem;
}

.breadcrumb-item {
    color: rgb(156, 163, 175);
    text-decoration: none;
    transition: color 0.2s;
}

.breadcrumb-item:hover {
    color: white;
}

.breadcrumb-item.active {
    color: white;
    font-weight: 500;
}

.breadcrumb-item:not(:last-child)::after {
    content: '/';
    margin-left: 0.5rem;
    color: rgb(75, 85, 99);
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .docs-content {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .docs-sidebar {
        position: relative;
        top: auto;
        margin-bottom: 1rem;
    }

    .docs-main {
        padding: 1.5rem;
    }

    .breadcrumb {
        flex-wrap: wrap;
        gap: 0.25rem;
    }
}
</style>

<!-- Unscoped styles for markdown content (similar to Comment.vue) -->
<style>
/* Note: Not scoped so that styles can apply to v-html content */
.markdown-content {
    color: white;
    max-width: none;
    line-height: 1.7;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
}

.markdown-content h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1rem;
    margin-top: 0;
    color: white;
}

.markdown-content h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    margin-top: 2rem;
    color: white;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

.markdown-content h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    margin-top: 1.5rem;
    color: white;
}

.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    margin-top: 1rem;
    color: white;
}

.markdown-content p {
    margin-bottom: 1rem;
    color: rgb(209, 213, 219);
    word-wrap: break-word;
    overflow-wrap: break-word;
}

.markdown-content a {
    color: rgb(96, 165, 250);
    text-decoration: none;
    word-wrap: break-word;
    overflow-wrap: break-word;
}

.markdown-content a:hover {
    color: rgb(147, 197, 253);
    text-decoration: underline;
}

.markdown-content .internal-docs-link {
    cursor: pointer;
    transition: color 0.2s ease;
}

.markdown-content .internal-docs-link:hover {
    color: rgb(147, 197, 253);
}

.markdown-content ul,
.markdown-content ol {
    margin: 1rem 0;
    padding-left: 1.5rem;
    color: rgb(209, 213, 219);
}

.markdown-content li {
    margin-bottom: 0.25rem;
}

.markdown-content blockquote {
    border-left: 4px solid rgb(75, 85, 99);
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    color: rgb(156, 163, 175);
}

.markdown-content code {
    background: rgba(0, 0, 0, 0.5);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: rgb(229, 231, 235);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.markdown-content pre {
    background: rgba(0, 0, 0, 0.7);
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    overflow-y: hidden;
    margin: 1rem 0;
    max-width: 100%;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
}

.markdown-content pre code {
    background: none;
    padding: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
}

.markdown-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    overflow-x: auto;
    display: block;
    white-space: nowrap;
}

.markdown-content th,
.markdown-content td {
    border: 1px solid rgb(75, 85, 99);
    padding: 0.5rem;
    text-align: left;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
    max-width: 300px;
}

.markdown-content th {
    background: rgba(0, 0, 0, 0.5);
    font-weight: 600;
    color: white;
}

.markdown-content td {
    color: rgb(209, 213, 219);
}

.markdown-content strong {
    font-weight: 700;
    color: white;
}

.markdown-content em {
    font-style: italic;
}
</style>
