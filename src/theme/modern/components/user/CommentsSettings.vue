<script setup lang="ts">
import DOMPurify from "dompurify";
import { marked } from "marked";
import Table from '~/src/theme/modern/components/common/Table.vue';

interface Comment {
    _id: string;
    identifier: string;
    characterId: number;
    characterName: string;
    corporationId?: number;
    corporationName?: string;
    allianceId?: number;
    allianceName?: string;
    killIdentifier: string;
    comment: string;
    createdAt: string;
    updatedAt: string;
    deleted: boolean;
}

interface CommentResponse {
    comments: Comment[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

interface Props {
    profileData?: any;
}

const props = defineProps<Props>();

// Composables
const { t } = useI18n();
const auth = useAuth();
const toast = useToast();

// State
const currentPage = ref(1);
const isLoading = ref(false);

// Modal state
const activeModal = ref<"delete" | null>(null);
const activeComment = ref<string | null>(null);
const isDeleting = ref(false);

// Fetch comments for the current user
const { data: commentsData, pending, error, refresh } = await useFetch<CommentResponse>('/api/comments', {
    query: computed(() => ({
        characterId: auth.user.value?.characterId,
        page: currentPage.value,
        limit: 20
    })),
    key: computed(() => `user-comments-${auth.user.value?.characterId}-${currentPage.value}`),
    server: false, // Only fetch on client side to ensure auth is ready
});

// Table columns definition
const columns = [
    {
        id: 'comment',
        header: t('settings.comments.comment', 'Comment'),
        width: '70%',
    },
    {
        id: 'date',
        header: t('settings.comments.date', 'Date'),
        width: '15%',
    },
    {
        id: 'actions',
        header: t('settings.comments.actions', 'Actions'),
        width: '15%',
    },
];

// Handle page changes
const handlePageChange = (page: number) => {
    currentPage.value = page;
    refresh();
};

// Format date - matching KillComments implementation
const formatDate = (dateString: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

// Configure markdown with custom renderers - matching KillComments implementation
const renderer = new marked.Renderer();

// TypeScript interfaces for marked token handling
interface MarkedToken {
    type: string;
    raw: string;
    href?: string;
    text?: string;
    tokens?: Array<MarkedToken>;
}

// Define media types for better type safety
type MediaType = "image" | "video" | "gif" | "iframe" | "unknown";

/**
 * Add autolink extension to handle raw URLs in text
 */
marked.use({
    extensions: [
        {
            name: "autolink",
            level: "inline",
            start(src: string) {
                return src.indexOf("http");
            },
            tokenizer(src: string) {
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
                    } as any;
                }
                return false as any;
            },
        },
    ],
});

/**
 * Extract URL from token based on marked version compatibility
 */
function extractUrl(token: any): string {
    if (!token) return "";
    if (typeof token === "string") return token;
    if (token.raw) return token.raw;
    if (token.href) return token.href;
    return "";
}

/**
 * Extract text from token based on marked version compatibility
 */
function extractText(token: any): string {
    if (!token) return "";
    if (typeof token === "string") return token;
    if (token.text) return token.text;
    if (token.raw) return token.raw;
    return "";
}

/**
 * Detect media type from URL
 */
function detectMediaType(url: string): {
    type: MediaType;
    id?: string;
    matches?: RegExpMatchArray | null;
} {
    // YouTube (including shorts)
    const youtubeMatch = url.match(/^https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) {
        return { type: "iframe", id: youtubeMatch[2] };
    }

    const youtubeMatch2 = url.match(/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (youtubeMatch2) {
        return { type: "iframe", id: youtubeMatch2[3] };
    }

    // Imgur direct
    const imgurDirectMatch = url.match(/^https?:\/\/(i\.)?imgur\.com\/([a-zA-Z0-9]+)(\.(jpeg|jpg|gif|png|mp4|webm))?$/i);
    if (imgurDirectMatch) {
        return { type: "image", matches: imgurDirectMatch };
    }

    // Imgur gallery
    const imgurGalleryMatch = url.match(/^https?:\/\/(www\.)?imgur\.com\/(gallery|a)\/([^\/\s]+)/i);
    if (imgurGalleryMatch) {
        return { type: "iframe" };
    }

    // Giphy
    const complexGiphyMatch = url.match(/^https?:\/\/(www\.)?giphy\.com\/gifs\/[a-zA-Z0-9-]+-([a-zA-Z0-9]+)/);
    if (complexGiphyMatch) {
        return { type: "image", id: complexGiphyMatch[2] };
    }

    const simpleGiphyMatch = url.match(/^https?:\/\/media\.giphy\.com\/media\/([a-zA-Z0-9]+)\/giphy\.gif/);
    if (simpleGiphyMatch) {
        return { type: "image", id: simpleGiphyMatch[1] };
    }

    // Tenor
    const tenorMatch = url.match(/^https?:\/\/(www\.)?tenor\.com\/view\/[a-zA-Z0-9-]+-([0-9]+)/);
    if (tenorMatch) {
        return { type: "iframe", id: tenorMatch[2] };
    }

    // Standard image
    const imageMatch = url.match(/\.(jpeg|jpg|gif|png)$/i);
    if (imageMatch) {
        return { type: "image" };
    }

    // Standard video
    const videoMatch = url.match(/\.(mp4|webm)$/i);
    if (videoMatch) {
        return { type: "video" };
    }

    return { type: "unknown" };
}

/**
 * Generate HTML for YouTube embed
 */
function renderYouTube(videoId: string): string {
    return `<div class="video-container">
            <iframe src="https://www.youtube.com/embed/${videoId}" frameBorder="0" allowFullScreen width="100%" height="315px"></iframe>
          </div>`;
}

/**
 * Generate HTML for Imgur direct media
 */
function renderImgurDirect(imgurId: string, extension: string, originalUrl: string): string {
    if (extension.match(/\.(mp4|webm)$/i)) {
        return `<div class="video-container">
                <video autoplay loop muted playsinline controls class="max-w-full">
                  <source src="https://i.imgur.com/${imgurId}${extension}" type="video/mp4">
                  Your browser doesn't support HTML5 video.
                </video>
              </div>`;
    }
    return `<div class="image-container">
            <img src="https://i.imgur.com/${imgurId}${extension || '.jpg'}" alt="Imgur Image" class="max-w-full h-auto" />
          </div>`;
}

/**
 * Generate HTML for Imgur gallery/album
 */
function renderImgurGallery(originalUrl: string): string {
    return `<div class="media-container">
            <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="source-link">
              View Imgur Gallery
            </a>
          </div>`;
}

/**
 * Generate HTML for Giphy media
 */
function renderGiphy(url: string, giphyId?: string): string {
    const imgSrc = giphyId ? `https://media.giphy.com/media/${giphyId}/giphy.gif` : url;
    return `<div class="gif-container">
            <img src="${imgSrc}" alt="Giphy GIF" class="max-w-full h-auto" />
          </div>`;
}

/**
 * Generate HTML for Tenor embed
 */
function renderTenor(tenorId: string, url: string): string {
    return `<div class="gif-container">
            <iframe src="https://tenor.com/embed/${tenorId}" frameBorder="0" width="100%" height="300px"></iframe>
          </div>`;
}

/**
 * Generate HTML for standard image
 */
function renderImage(url: string, altText: string): string {
    return `<div class="image-container">
            <img src="${url}" alt="${altText}" class="max-w-full h-auto" />
          </div>`;
}

/**
 * Generate HTML for standard video
 */
function renderVideo(url: string): string {
    return `<div class="video-container">
            <video autoplay loop muted playsinline controls class="max-w-full">
              <source src="${url}" type="video/mp4">
              Your browser doesn't support HTML5 video.
            </video>
          </div>`;
}

// Custom link renderer to handle both older and newer marked versions
renderer.link = ({ href, title, tokens }: any): string => {
    const url = extractUrl(href);
    const linkText = extractText(tokens?.[0]?.text || href);
    const linkTitle = title || "";

    if (!url) {
        return `<span>${linkText || "link"}</span>`;
    }

    const { type, id, matches } = detectMediaType(url);

    switch (type) {
        case "iframe":
            if (url.includes("youtube.com") || url.includes("youtu.be")) {
                return id ? renderYouTube(id) : renderImage(url, linkText);
            }
            if (url.includes("tenor.com") && id) {
                return renderTenor(id, url);
            }
            if (url.includes("imgur.com") && !url.includes("i.imgur.com")) {
                return renderImgurGallery(url);
            }
            break;

        case "video":
            return renderVideo(url);

        case "image":
            if (url.includes("imgur.com") && matches && matches[2]) {
                const imgurId = matches[2];
                const extension = matches[3] || ".jpg";
                return renderImgurDirect(imgurId, extension, url);
            }
            if (url.includes("giphy.com") || url.includes("media.giphy.com")) {
                return renderGiphy(url, id);
            }
            return renderImage(url, linkText);
    }

    return `<a href="${url}" title="${linkTitle}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
};

// Apply the custom renderer to marked
marked.use({ renderer });

// Render markdown - matching KillComments implementation
const renderMarkdown = (text: string): string => {
    if (!text) return "";

    // Convert markdown to HTML and sanitize
    const rawHTML = marked(text) as string;
    return DOMPurify.sanitize(rawHTML, {
        ADD_TAGS: ["iframe", "blockquote", "video", "source"],
        ADD_ATTR: [
            "allow",
            "allowfullscreen",
            "frameborder",
            "scrolling",
            "target",
            "rel",
            "async",
            "charset",
            "data-id",
            "lang",
            "controls",
            "loop",
            "muted",
            "playsinline",
            "type",
            "src",
        ],
        FORBID_TAGS: ["script", "style", "form", "input", "button", "textarea", "select", "option"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onmouseout", "eval"],
    });
};

// Navigate to killmail
const viewKillmail = (comment: Comment) => {
    // killIdentifier format is "kill:<id>", so we extract the ID part
    const killId = comment.killIdentifier.split(':')[1];
    navigateTo(`/kill/${killId}`);
};

// Modal control functions
const openDeleteModal = (identifier: string) => {
    activeComment.value = identifier;
    activeModal.value = "delete";
};

const closeModal = () => {
    activeModal.value = null;
    activeComment.value = null;
};

// Delete comment function - matching KillComments implementation
const confirmDelete = async () => {
    if (!activeComment.value || isDeleting.value) return;

    isDeleting.value = true;

    try {
        const { data, error } = await useFetch("/api/comments/delete", {
            method: "POST",
            body: {
                identifier: activeComment.value,
            },
        });

        if (error.value) {
            toast.add({
                title: t("settings.comments.deleteError", "Failed to delete comment"),
                description: error.value.data?.message || t("settings.comments.deleteErrorDesc", "An error occurred while deleting the comment."),
                color: "error",
                icon: "lucide:alert-circle"
            });
            return;
        }

        // Show success toast
        toast.add({
            title: t("settings.comments.deleteSuccess", "Comment deleted"),
            description: t("settings.comments.deleteSuccessDesc", "The comment has been successfully deleted."),
            color: "success",
            icon: "lucide:check-circle"
        });

        // Refresh the comments list
        await refresh();
        closeModal();
    } catch (err) {
        console.error("Error deleting comment:", err);
        toast.add({
            title: t("settings.comments.deleteError", "Failed to delete comment"),
            description: t("settings.comments.deleteErrorDesc", "An error occurred while deleting the comment."),
            color: "error",
            icon: "lucide:alert-circle"
        });
    } finally {
        isDeleting.value = false;
    }
};

// Event handlers for keyboard events
const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && activeModal.value) {
        closeModal();
    }
};

// Add keyboard event listener on mount
onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);
});

// Clean up event listener on unmount
onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
    <div class="space-y-6 p-6">
        <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ t("settings.comments.title", "My Comments") }}
            </h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ t("settings.comments.description", "View and manage all comments you've made on killmails") }}
            </p>
        </div>

        <!-- Loading State -->
        <div v-if="pending" class="flex items-center justify-center py-8">
            <div class="text-gray-600 dark:text-gray-400">{{ t("common.loading") }}</div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
            <p class="text-red-800 dark:text-red-200">
                {{ t("settings.comments.error", "Failed to load comments") }}
            </p>
        </div>

        <!-- No Comments State -->
        <div v-else-if="!commentsData?.comments?.length" class="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
            <div class="flex">
                <Icon name="lucide:message-circle" class="h-5 w-5 text-blue-400" />
                <div class="ml-3">
                    <p class="text-sm text-blue-700 dark:text-blue-300">
                        {{ t("settings.comments.noComments", "You haven't made any comments yet.") }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Comments List -->
        <div v-else class="space-y-4">
            <!-- Stats -->
            <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
                <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600 dark:text-gray-400">
                        {{ t("settings.comments.totalComments", "Total Comments") }}:
                        <span class="font-medium text-gray-900 dark:text-white">
                            {{ commentsData.pagination.total }}
                        </span>
                    </span>
                    <span class="text-gray-600 dark:text-gray-400">
                        {{ t("settings.comments.showing", "Showing") }}
                        {{ ((commentsData.pagination.page - 1) * commentsData.pagination.limit) + 1 }}-{{
                            Math.min(commentsData.pagination.page * commentsData.pagination.limit,
                                commentsData.pagination.total) }}
                        {{ t("settings.comments.of", "of") }} {{ commentsData.pagination.total }}
                    </span>
                </div>
            </div>

            <!-- Comments Table -->
            <Table :columns="columns" :items="commentsData.comments" :loading="pending" density="normal"
                background="default" hover bordered>
                <template #cell-comment="{ item }">
                    <div class="comment-content">
                        <div class="markdown-content prose prose-sm dark:prose-invert max-w-none"
                            v-html="renderMarkdown((item as Comment).comment)">
                        </div>
                        <div v-if="(item as Comment).createdAt !== (item as Comment).updatedAt"
                            class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <Icon name="lucide:edit" class="h-3 w-3 inline" />
                            {{ t("settings.comments.edited", "Edited") }} {{ formatDate((item as Comment).updatedAt) }}
                        </div>
                    </div>
                </template>

                <template #cell-date="{ item }">
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                        {{ formatDate((item as Comment).createdAt) }}
                    </div>
                </template>

                <template #cell-actions="{ item }">
                    <div class="flex flex-col items-start gap-2">
                        <UButton size="sm" variant="outline" @click="viewKillmail(item as Comment)">
                            <Icon name="lucide:external-link" class="h-4 w-4 mr-1" />
                            {{ t("settings.comments.viewKillmail", "View Killmail") }}
                        </UButton>
                        <UButton size="sm" variant="outline" color="warning"
                            @click="openDeleteModal((item as Comment).identifier)">
                            <Icon name="lucide:trash-2" class="h-4 w-4 mr-1" />
                            {{ t("settings.comments.delete", "Delete") }}
                        </UButton>
                    </div>
                </template>
            </Table>

            <!-- Pagination -->
            <div v-if="commentsData.pagination.pages > 1" class="flex justify-center">
                <div class="flex items-center gap-2">
                    <Button :disabled="!commentsData.pagination.hasPrev" variant="outline" size="sm"
                        @click="handlePageChange(currentPage - 1)">
                        <Icon name="lucide:chevron-left" class="h-4 w-4" />
                        {{ t("common.previous", "Previous") }}
                    </Button>

                    <div class="flex items-center gap-1">
                        <template v-for="page in Math.min(5, commentsData.pagination.pages)" :key="page">
                            <Button :variant="page === currentPage ? 'solid' : 'outline'" size="sm"
                                @click="handlePageChange(page)">
                                {{ page }}
                            </Button>
                        </template>
                        <span v-if="commentsData.pagination.pages > 5" class="px-2 text-gray-500">...</span>
                        <Button v-if="commentsData.pagination.pages > 5 && currentPage < commentsData.pagination.pages"
                            :variant="currentPage === commentsData.pagination.pages ? 'solid' : 'outline'" size="sm"
                            @click="handlePageChange(commentsData.pagination.pages)">
                            {{ commentsData.pagination.pages }}
                        </Button>
                    </div>

                    <Button :disabled="!commentsData.pagination.hasNext" variant="outline" size="sm"
                        @click="handlePageChange(currentPage + 1)">
                        {{ t("common.next", "Next") }}
                        <Icon name="lucide:chevron-right" class="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>

        <!-- Delete Modal -->
        <Transition name="modal-fade">
            <div v-if="activeModal === 'delete'" class="custom-modal-overlay" @click="closeModal">
                <div class="custom-modal" @click.stop>
                    <div class="custom-modal-header">
                        <h3 class="text-lg font-medium">{{ t('settings.comments.deleteComment', 'Delete Comment') }}
                        </h3>
                        <button @click="closeModal" class="modal-close-btn">
                            <Icon name="lucide:x" class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="custom-modal-body">
                        <p>{{ t('settings.comments.confirmDeleteMessage') }}</p>
                    </div>

                    <div class="custom-modal-footer">
                        <Button variant="outline" @click="closeModal">
                            {{ t('common.cancel', 'Cancel') }}
                        </Button>
                        <Button variant="solid" color="red" :disabled="isDeleting" @click="confirmDelete">
                            {{ isDeleting ? t('common.deleting') : t('settings.comments.confirmDelete') }}
                        </Button>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.entity-name {
    font-size: 0.95rem;
    width: 100%;
}

.entity-name.primary {
    font-weight: 500;
}

.entity-name.secondary {
    font-size: 0.85rem;
    color: light-dark(#6b7280, #9ca3af);
}

.entity-link {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s ease;
    max-width: 100%;
}

.entity-link:hover {
    color: #4fc3f7;
}

.entity-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.comment-content {
    max-width: 500px;
    word-wrap: break-word;
    overflow-wrap: break-word;
}

.markdown-content :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.375rem;
}

.markdown-content :deep(iframe) {
    max-width: 100%;
    border-radius: 0.375rem;
}

.markdown-content :deep(a) {
    color: #4fc3f7;
    text-decoration: none;
}

.markdown-content :deep(a:hover) {
    text-decoration: underline;
}

.markdown-content :deep(pre) {
    background-color: light-dark(#f3f4f6, #374151);
    padding: 0.75rem;
    border-radius: 0.375rem;
    overflow-x: auto;
}

.markdown-content :deep(code) {
    background-color: light-dark(#f3f4f6, #374151);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
}

.video-container,
.gif-container {
    margin: 0.75rem 0;
    border-radius: 0.375rem;
    overflow: hidden;
}

.image-container,
.embed-container {
    margin: 0.75rem 0;
    border-radius: 0.375rem;
    overflow: hidden;
}

.video-container video {
    width: 100%;
    height: auto;
}

.media-container {
    margin: 0.75rem 0;
    padding: 0.75rem;
    border: 1px solid light-dark(#e5e7eb, #374151);
    border-radius: 0.375rem;
    background-color: light-dark(#f9fafb, #1f2937);
}

.source-link {
    color: #4fc3f7;
    text-decoration: none;
    font-weight: 500;
}

.source-link:hover {
    text-decoration: underline;
}

/* Modal styles - matching KillComments */
.custom-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.custom-modal {
    background-color: light-dark(white, #1f2937);
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.custom-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid light-dark(#e5e7eb, #374151);
}

.modal-close-btn {
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: background-color 0.2s;
}

.modal-close-btn:hover {
    background-color: light-dark(#f3f4f6, #374151);
}

.custom-modal-body {
    padding: 1.5rem;
}

.custom-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid light-dark(#e5e7eb, #374151);
}

/* Animation */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    display: inline-block;
}
</style>
