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
                            :current-path="currentDocPath" @navigate="handleNavigation" />
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
                    <div class="markdown-content" v-html="renderedContent" />
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
import { marked } from 'marked';

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

// SEO Meta
useSeoMeta({
    title: t('docs.title'),
    description: t('docs.description'),
    ogTitle: t('docs.title'),
    ogDescription: t('docs.description'),
});

// Reactive state
const currentDocPath = ref<string>('');
const currentDoc = ref<DocContent | null>(null);

// Fetch documentation structure
const {
    data: structureData,
    pending: structurePending,
    error: structureError
} = await useFetch<{ structure: DocFile[]; error: string | null }>('/api/docs/structure');

const docsStructure = computed(() => structureData.value?.structure || []);

// Fetch current document content
const {
    data: contentData,
    pending: contentPending,
    error: contentError,
    refresh: refreshContent
} = await useFetch<DocContent>(() => `/api/docs/${currentDocPath.value || 'index'}`, {
    key: () => `doc-content-${currentDocPath.value || 'index'}`,
    watch: [currentDocPath]
});

// Update current doc when content changes
watch(contentData, (newData) => {
    if (newData) {
        currentDoc.value = newData;
    }
}, { immediate: true });

// Computed properties
const renderedContent = computed(() => {
    if (!currentDoc.value?.content) return '';

    try {
        // Configure marked with better options (similar to Comment.vue)
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false
        });

        // Create custom renderer for links
        const renderer = new marked.Renderer();

        // Custom link renderer to handle documentation links
        renderer.link = ({ href, title, tokens }: any): string => {
            const url = href || '';
            const linkText = tokens?.[0]?.text || href || 'link';
            const linkTitle = title || '';

            // Transform internal documentation links
            if (url.startsWith('./') || url.startsWith('../') || url.endsWith('.md')) {
                let transformedUrl = url;

                // Handle relative paths
                if (url.startsWith('./')) {
                    // Same directory: ./file.md -> current_path/file
                    const currentDir = currentDocPath.value ? currentDocPath.value.split('/').slice(0, -1).join('/') : '';
                    transformedUrl = url.replace('./', '').replace('.md', '');
                    if (currentDir) {
                        transformedUrl = `${currentDir}/${transformedUrl}`;
                    }
                } else if (url.startsWith('../')) {
                    // Parent directory: ../file.md -> parent_path/file
                    const currentParts = currentDocPath.value ? currentDocPath.value.split('/') : [];
                    let pathParts = [...currentParts];
                    let relativePath = url;

                    // Remove current file from path
                    if (pathParts.length > 0) {
                        pathParts.pop();
                    }

                    // Process ../ segments
                    while (relativePath.startsWith('../')) {
                        relativePath = relativePath.substring(3);
                        if (pathParts.length > 0) {
                            pathParts.pop();
                        }
                    }

                    transformedUrl = relativePath.replace('.md', '');
                    if (pathParts.length > 0) {
                        transformedUrl = `${pathParts.join('/')}/${transformedUrl}`;
                    }
                } else if (url.endsWith('.md')) {
                    // Direct .md file: file.md -> file
                    transformedUrl = url.replace('.md', '');
                }

                // Create internal link to docs viewer
                const docsUrl = `/docs/${transformedUrl}`;
                return `<a href="${docsUrl}" title="${linkTitle}">${linkText}</a>`;
            }

            // External links - open in new tab
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return `<a href="${url}" title="${linkTitle}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
            }

            // Default: regular internal link
            return `<a href="${url}" title="${linkTitle}">${linkText}</a>`;
        };

        // Add autolink extension for better URL handling
        marked.use({
            renderer,
            extensions: [
                {
                    name: "autolink",
                    level: "inline",
                    start(src) {
                        return src.indexOf("http");
                    },
                    tokenizer(src) {
                        const urlRegex = /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/;
                        const match = src.match(urlRegex);
                        if (match) {
                            return {
                                type: "link",
                                raw: match[0],
                                text: match[0],
                                href: match[0],
                                tokens: [
                                    {
                                        type: "text",
                                        raw: match[0],
                                        text: match[0],
                                    },
                                ],
                            };
                        }
                        return undefined;
                    },
                },
            ],
        });

        const rawHTML = marked.parse(currentDoc.value.content);
        return DOMPurify.sanitize(rawHTML, {
            ADD_TAGS: ['iframe', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            ADD_ATTR: ['target', 'rel', 'href', 'src', 'alt', 'title', 'id', 'class'],
            FORBID_TAGS: ['script', 'style', 'form', 'input', 'button', 'textarea', 'select', 'option'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'eval'],
        });
    } catch (error) {
        console.error('Error rendering markdown:', error);
        return DOMPurify.sanitize(currentDoc.value.content);
    }
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
const handleNavigation = (path: string) => {
    if (path === currentDocPath.value) return;

    router.push(`/docs/${path}`);
};

// Route watching
watch(() => route.params.path, (newPath) => {
    if (Array.isArray(newPath)) {
        currentDocPath.value = newPath.join('/');
    } else if (newPath) {
        currentDocPath.value = newPath;
    } else {
        currentDocPath.value = 'index';
    }
}, { immediate: true });

// Initialize
onMounted(() => {
    if (route.params.path) {
        if (Array.isArray(route.params.path)) {
            currentDocPath.value = route.params.path.join('/');
        } else {
            currentDocPath.value = route.params.path;
        }
    } else {
        currentDocPath.value = 'index';
    }
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
