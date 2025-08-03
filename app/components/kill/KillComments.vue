<template>
    <div class="overflow-x-auto">
        <!-- Loading indicator -->
        <div v-if="!commentsLoaded" class="loading-comments p-4 text-center">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin inline-block mr-2" />
            {{ $t('loading') }}...
        </div>

        <!-- Display existing comments -->
        <div v-for="comment in comments" :key="comment.identifier" class="comment section mb-4 relative"
            :id="`comment-${comment.identifier}`">

            <!-- Comment content -->
            <div class="flex flex-col" :class="{ 'blur-sm': activeModal && activeComment === comment.identifier }">
                <!-- Comment header with user info -->
                <div class="flex items-center mb-3 pb-2 border-b border-light-dark-border">
                    <NuxtLink :to="`/character/${comment.characterId}`" class="flex-shrink-0">
                        <UAvatar :src="`https://images.evetech.net/characters/${comment.characterId}/portrait?size=64`"
                            :alt="comment.characterName" size="md" class="mr-3" />
                    </NuxtLink>
                    <div class="entity-details">
                        <NuxtLink :to="`/character/${comment.characterId}`" class="entity-link entity-name primary">
                            {{ comment.characterName }}
                        </NuxtLink>
                        <div class="entity-name secondary">
                            <template v-if="comment.corporationName">
                                <NuxtLink v-if="comment.corporationId" :to="`/corporation/${comment.corporationId}`"
                                    class="entity-link truncate">
                                    {{ comment.corporationName }}
                                </NuxtLink>
                                <span v-if="comment.allianceName" class="truncate">
                                    /
                                    <NuxtLink v-if="comment.allianceId" :to="`/alliance/${comment.allianceId}`"
                                        class="entity-link truncate">
                                        {{ comment.allianceName }}
                                    </NuxtLink>
                                    <span v-else>{{ comment.allianceName }}</span>
                                </span>
                            </template>
                        </div>
                    </div>
                    <div class="ml-auto flex items-center gap-2">
                        <div class="text-xs text-light-dark-secondary">
                            {{ formatDate(comment.createdAt) }}
                        </div>

                        <!-- Comment actions (icon buttons) -->
                        <div v-if="isAuthenticated" class="flex items-center gap-2">
                            <!-- Report button - show for all users except the comment author -->
                            <button v-if="currentUser?.characterId !== comment.characterId"
                                class="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                title="Report comment" @click="openReportModal(comment.identifier)">
                                <Icon name="lucide:flag" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>

                            <!-- Delete button - only for admin or comment author -->
                            <button v-if="isAdministrator || currentUser?.characterId === comment.characterId"
                                class="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                title="Delete comment" @click="openDeleteModal(comment.identifier)">
                                <Icon name="lucide:x" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>

                <Comment :comment="comment.comment" />
            </div>

            <!-- Custom in-comment modal for reporting -->
            <Transition name="modal-fade">
                <div v-if="activeModal === 'report' && activeComment === comment.identifier"
                    class="custom-modal-overlay">
                    <div class="custom-modal" @click.stop>
                        <div class="custom-modal-header">
                            <h3 class="text-lg font-medium">{{ $t('comment.report_comment') }}</h3>
                            <button @click="closeModal" class="modal-close-btn">
                                <Icon name="lucide:x" class="w-5 h-5" />
                            </button>
                        </div>

                        <div class="custom-modal-body">
                            <label class="block mb-1 font-medium text-sm">{{ $t('comment.report_reason') }}</label>
                            <textarea v-model="reportMessage"
                                class="w-full border rounded-md p-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                                rows="4" :placeholder="$t('comment.report_placeholder')" @keydown.esc="closeModal"
                                ref="reportTextarea"></textarea>
                        </div>

                        <div class="custom-modal-footer">
                            <button @click="closeModal"
                                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                {{ $t('common.cancel') }}
                            </button>
                            <button @click="submitReport" :disabled="!reportMessage.trim() || isReporting"
                                class="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {{ isReporting ? $t('loading') : $t('comment.submit_report') }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>

            <!-- Custom in-comment modal for deletion -->
            <Transition name="modal-fade">
                <div v-if="activeModal === 'delete' && activeComment === comment.identifier"
                    class="custom-modal-overlay">
                    <div class="custom-modal" @click.stop>
                        <div class="custom-modal-header">
                            <h3 class="text-lg font-medium">{{ $t('comment.delete_comment') }}</h3>
                            <button @click="closeModal" class="modal-close-btn">
                                <Icon name="lucide:x" class="w-5 h-5" />
                            </button>
                        </div>

                        <div class="custom-modal-body">
                            <p>{{ $t('comment.confirm_delete_message') }}</p>
                        </div>

                        <div class="custom-modal-footer">
                            <button @click="closeModal"
                                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                {{ $t('common.cancel') }}
                            </button>
                            <button @click="confirmDelete()" :disabled="isDeleting"
                                class="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {{ isDeleting ? $t('loading') : $t('comment.confirm_delete') }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>

        <div v-if="comments.length === 0" class="section mb-4 text-center py-8">
            <div class="text-light-dark-secondary">{{ $t('noComments') }}</div>
        </div>

        <!-- WebSocket connection status indicator -->
        <div v-if="!wsConnected" class="text-xs text-amber-500 mb-2 flex items-center justify-end gap-1">
            <div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span>{{ $t('reconnecting_ws', { attempt: wsReconnectAttempts, max: 5 }) }}</span>
        </div>

        <!-- Comment Input Box for authenticated users -->
        <div v-if="isAuthenticated" class="section mb-4">
            <!-- Comment header with user info -->
            <div class="flex items-center mb-3 pb-2 border-b border-light-dark-border">
                <NuxtLink :to="`/character/${currentUser.characterId}`" class="flex-shrink-0">
                    <UAvatar :src="`https://images.evetech.net/characters/${currentUser.characterId}/portrait?size=64`"
                        :alt="currentUser.characterName" size="md" class="mr-3" />
                </NuxtLink>
                <div class="entity-details">
                    <NuxtLink :to="`/character/${currentUser.characterId}`" class="entity-link entity-name primary">
                        {{ currentUser.characterName }}
                    </NuxtLink>
                    <div v-if="currentUser.corporationName" class="entity-name secondary">
                        <NuxtLink v-if="currentUser.corporationId" :to="`/corporation/${currentUser.corporationId}`"
                            class="entity-link truncate">
                            {{ currentUser.corporationName }}
                        </NuxtLink>
                        <span v-if="currentUser.allianceName" class="truncate">
                            /
                            <NuxtLink v-if="currentUser.allianceId" :to="`/alliance/${currentUser.allianceId}`"
                                class="entity-link truncate">
                                {{ currentUser.allianceName }}
                            </NuxtLink>
                            <span v-else>{{ currentUser.allianceName }}</span>
                        </span>
                    </div>
                </div>

                <!-- Tab switcher in the top right -->
                <div class="ml-auto">
                    <div class="flex border border-light-dark-border rounded-md overflow-hidden">
                        <button @click="activeTab = 'write'" class="px-3 py-1 text-xs"
                            :class="activeTab === 'write' ? 'bg-primary-500 text-white' : 'bg-light-dark-tab text-light-dark-secondary'">
                            {{ $t('write') }}
                        </button>
                        <button @click="activeTab = 'preview'" class="px-3 py-1 text-xs"
                            :class="activeTab === 'preview' ? 'bg-primary-500 text-white' : 'bg-light-dark-tab text-light-dark-secondary'">
                            {{ $t('preview') }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Editor container -->
            <div class="w-full">
                <!-- Write tab -->
                <div v-show="activeTab === 'write'" class="editor-container">
                    <UTextarea v-model="newComment" :rows="6"
                        class="w-full mb-2 font-mono bg-light-dark-input border-light-dark-border"
                        :disabled="isSubmitting" :placeholder="$t('placeholder')" @input="updateEditorHeight" />

                    <div class="editor-toolbar flex flex-wrap gap-2 mb-2">
                        <UButton size="xs" @click="insertMarkdown('**', '**')" color="neutral">
                            <Icon name="lucide:bold" class="w-4 h-4 mr-1" />
                            {{ $t('bold') }}
                        </UButton>
                        <UButton size="xs" @click="insertMarkdown('*', '*')" color="neutral">
                            <Icon name="lucide:italic" class="w-4 h-4 mr-1" />
                            {{ $t('italic') }}
                        </UButton>
                        <UButton size="xs" @click="insertMarkdown('[', '](url)')" color="neutral">
                            <Icon name="lucide:link" class="w-4 h-4 mr-1" />
                            {{ $t('link') }}
                        </UButton>
                        <UButton size="xs" @click="insertMarkdown('\n```\n', '\n```')" color="neutral">
                            <Icon name="lucide:code" class="w-4 h-4 mr-1" />
                            {{ $t('code') }}
                        </UButton>
                        <UButton size="xs" @click="insertImage" color="neutral">
                            <Icon name="lucide:image" class="w-4 h-4 mr-1" />
                            {{ $t('image') }}
                        </UButton>
                        <UButton size="xs" @click="insertYoutube" color="neutral">
                            <Icon name="lucide:video" class="w-4 h-4 mr-1" />
                            {{ $t('youtube') }}
                        </UButton>
                        <UButton size="xs" @click="insertImgur" color="neutral">
                            <Icon name="simple-icons:imgur" class="w-4 h-4 mr-1" />
                            {{ $t('imgur') }}
                        </UButton>
                        <UButton size="xs" @click="insertGiphy" color="neutral">
                            <Icon name="simple-icons:giphy" class="w-4 h-4 mr-1" />
                            {{ $t('giphy') }}
                        </UButton>
                        <UButton size="xs" @click="insertTenor" color="neutral">
                            <Icon name="simple-icons:tenor" class="w-4 h-4 mr-1" />
                            {{ $t('tenor') }}
                        </UButton>
                    </div>
                </div>

                <!-- Preview tab -->
                <div v-show="activeTab === 'preview'"
                    class="preview-container border rounded-md p-3 mb-3 prose prose-sm dark:prose-invert bg-light-dark-input"
                    ref="previewContainerRef">
                    <Comment v-if="newComment.trim()" :comment="newComment" />
                    <div v-else class="text-light-dark-secondary text-sm italic">{{ $t('preview_empty') }}</div>
                </div>
            </div>

            <div class="flex justify-between mt-3">
                <p class="text-xs text-light-dark-secondary" :class="{ 'text-red-500': charactersRemaining < 0 }">
                    {{ charactersRemaining }} {{ $t('charactersRemaining') }}
                </p>
                <UButton :loading="isSubmitting" :disabled="isSubmittingDisabled" @click="postComment" color="primary"
                    size="sm">
                    {{ $t('postComment') }}
                </UButton>
            </div>

            <p v-if="errorMessage" class="text-red-500 text-sm mt-2">{{ errorMessage }}</p>
        </div>

        <!-- Login prompt for unauthenticated users -->
        <div v-else class="section mb-4 text-center py-4">
            <p class="mb-2">{{ $t('loginToComment') }}</p>
            <UButton color="primary" @click="loginToComment">{{ $t('login') }}</UButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { isAuthenticated, currentUser, login, isAdministrator } = useAuth();

// Props
const props = defineProps({
    killId: {
        type: Number,
        required: true,
    },
});

// State
const comments = ref<any[]>([]);
const newComment = ref("");
const commentsLoaded = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref("");
const lastPostedComment = ref("");
const commentLimit = 1000;
const activeTab = ref("write"); // 'write' or 'preview'
const charactersRemaining = computed(() => commentLimit - newComment.value.length);
const killIdentifier = computed(() => `kill:${props.killId}`);

// WebSocket connection with composable
const {
    isConnected: wsConnected,
    connectionAttempts: wsReconnectAttempts,
    isPaused: wsIsPaused,
    sendMessage: wsSendMessage,
    pause: pauseWs, // Destructure pause
    resume: resumeWs, // Destructure resume
} = useWebSocket({
    url: "wss://ws.eve-kill.com/comments",
    autoConnect: true,
    handleBfCache: true,
    useGlobalInstance: true,
    globalRefKey: "comments",
    debug: false, // Disable debug logging
    onMessage: handleWebSocketMessage,
});

// Fix layout juddering
const editorContainerHeight = ref<number | null>(null);
const textareaHeight = ref<number | null>(null);
const previewContainerRef = ref<HTMLElement | null>(null);

// Modal state
const activeModal = ref<"report" | "delete" | null>(null);
const activeComment = ref<string | null>(null);
const reportMessage = ref("");
const isDeleting = ref(false);
const isReporting = ref(false);
const reportTextarea = ref<HTMLTextAreaElement | null>(null);

// Computed
const isSubmittingDisabled = computed(() => {
    return (
        isSubmitting.value ||
        newComment.value.trim() === "" ||
        charactersRemaining.value < 0 ||
        newComment.value.trim() === lastPostedComment.value
    );
});

// Methods
function formatDate(dateString: string) {
    if (!dateString) return "";

    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function insertMarkdown(prefix: string, suffix: string) {
    const textarea = document.querySelector("textarea");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = newComment.value.substring(start, end);

    newComment.value =
        newComment.value.substring(0, start) +
        prefix +
        selection +
        suffix +
        newComment.value.substring(end);

    // Set cursor position to right after the inserted text
    nextTick(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + prefix.length + selection.length;
    });
}

function insertImage() {
    const url = prompt(t("markdown_editor.image_url_prompt"), "https://");
    if (url) {
        const markdown = `![Image](${url})`;
        insertTextAtCursor(markdown);
    }
}

function insertYoutube() {
    const url = prompt(t("markdown_editor.youtube_url_prompt"), "https://www.youtube.com/watch?v=");
    if (url) {
        insertTextAtCursor(url);
    }
}

function insertImgur() {
    const url = prompt(t("markdown_editor.imgur_url_prompt"), "https://imgur.com/");
    if (url) {
        insertTextAtCursor(url);
    }
}

function insertGiphy() {
    const url = prompt(t("markdown_editor.giphy_url_prompt"), "https://giphy.com/gifs/");
    if (url) {
        insertTextAtCursor(url);
    }
}

function insertTenor() {
    const url = prompt(t("markdown_editor.tenor_url_prompt"), "https://tenor.com/view/");
    if (url) {
        insertTextAtCursor(url);
    }
}

function insertTextAtCursor(text: string) {
    const textarea = document.querySelector("textarea");
    if (!textarea) return;

    const start = textarea.selectionStart;
    newComment.value =
        newComment.value.substring(0, start) + text + newComment.value.substring(start);
}

async function fetchComments() {
    try {
        if (!killIdentifier.value) {
            return;
        }

        const { data, error } = await useFetch(`/api/comments/${killIdentifier.value}`);

        if (error.value) {
            console.error(`Error fetching comments: ${error.value.message}`);
            return;
        }

        comments.value = (data.value as any[]) || [];
        commentsLoaded.value = true;
    } catch (err) {
        console.error("Error fetching comments:", err);
    }
}

async function postComment() {
    if (isSubmittingDisabled.value) return;

    // Check for duplicate comment
    if (newComment.value.trim() === lastPostedComment.value) {
        errorMessage.value = t("duplicate_comment_error");
        return;
    }

    isSubmitting.value = true;
    errorMessage.value = "";

    try {
        // Post JSON data to the API
        const { data, error } = await useFetch(`/api/comments/${killIdentifier.value}`, {
            method: "POST",
            body: {
                comment: newComment.value.trim(),
            },
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (error.value) {
            // Extract just the relevant part of the error message
            if (error.value.message) {
                // Parse error message to extract just the content after the status code
                const match = error.value.message.match(/\d{3}\s+(.*)/);
                errorMessage.value = match?.[1] ?? (error.value.message ?? "Unknown error");

                // If the error is about moderation, format it nicely
                if (errorMessage.value.includes("potentially harmful content")) {
                    const moderationMatch = errorMessage.value.match(
                        /Comment contains potentially harmful content.*?$/,
                    );
                    if (moderationMatch) {
                        errorMessage.value = moderationMatch[0];
                    }
                }
            } else {
                errorMessage.value = t("comment_post_error");
            }
            return;
        }

        // Don't need to manually add the comment here anymore
        // as the WebSocket will send us the update
        lastPostedComment.value = newComment.value.trim();
        newComment.value = "";
        activeTab.value = "write"; // Reset to write tab after posting
    } catch (err) {
        errorMessage.value = t("comment_post_error");
    } finally {
        isSubmitting.value = false;
    }
}

// Fix layout juddering when typing
function updateEditorHeight() {
    nextTick(() => {
        const textarea = document.querySelector(".editor-container textarea");

        if (textarea && !textareaHeight.value) {
            // Save initial height when first loaded
            textareaHeight.value = textarea.clientHeight;

            // Also save the container height
            const container = document.querySelector(".editor-container");
            if (container) {
                editorContainerHeight.value = container.clientHeight;
            }
        }

        // Apply fixed height to preview container to match editor
        if (previewContainerRef.value && editorContainerHeight.value) {
            previewContainerRef.value.style.minHeight = `${editorContainerHeight.value}px`;
        }
    });
}

// Handler functions for WebSocket events
function handleWebSocketMessage(data: any) {
    try {
        // Handle ping/pong for connection health
        if (data.type === "ping") {
            // Respond to server ping with pong
            wsSendMessage(JSON.stringify({
                type: "pong",
                timestamp: data.timestamp
            }));
            return;
        }

        // Process comment events based on type
        if (data.eventType === "new") {
            handleNewComment(data.comment);
        } else if (data.eventType === "deleted") {
            handleDeletedComment(data.comment);
        }
    } catch (err) {
        console.error("❌ Comments: Error processing WebSocket message:", err);
    }
}

// Function to handle new comments from WebSocket
function handleNewComment(comment: any) {
    // Only process if this comment is for the current kill
    if (comment.killIdentifier === killIdentifier.value) {
        // Check if we don't already have this comment (prevent duplicates)
        if (!comments.value.some((c) => c.identifier === comment.identifier)) {
            // Add to beginning of array (newest first)
            comments.value = [comment, ...comments.value];
        }
    }
}

// Function to handle deleted comments from WebSocket
function handleDeletedComment(comment: any) {
    // Only process if this comment is for the current kill
    if (comment.killIdentifier === killIdentifier.value) {
        // Remove the deleted comment from the list
        comments.value = comments.value.filter((c) => c.identifier !== comment.identifier);
    }
}

// Function to scroll to comment fragment in URL
function scrollToCommentFragment() {
    if (import.meta.client) {
        const fragment = window.location.hash;
        if (fragment?.startsWith("#comment-")) {
            nextTick(() => {
                const commentId = fragment.slice(1); // Remove the # symbol
                const commentElement = document.getElementById(commentId);
                if (commentElement) {
                    commentElement.scrollIntoView({ behavior: "smooth" });
                    // Add a highlight effect
                    commentElement.classList.add("highlighted-comment");
                    setTimeout(() => {
                        commentElement.classList.remove("highlighted-comment");
                    }, 2000);
                }
            });
        }
    }
}

// Modal control functions
function openReportModal(identifier: string) {
    activeComment.value = identifier;
    activeModal.value = "report";
    reportMessage.value = "";

    nextTick(() => {
        if (reportTextarea.value) {
            reportTextarea.value.focus();
        }
    });
}

function openDeleteModal(identifier: string) {
    activeComment.value = identifier;
    activeModal.value = "delete";
}

function closeModal() {
    activeModal.value = null;
    activeComment.value = null;
    reportMessage.value = "";
}

// Submit comment report to the API
async function submitReport() {
    if (!reportMessage.value.trim() || !activeComment.value || isReporting.value) return;

    isReporting.value = true;

    try {
        const { data, error } = await useFetch("/api/comments/report", {
            method: "POST",
            body: {
                identifier: activeComment.value,
                reportMessage: reportMessage.value.trim(),
            },
        });

        if (error.value) {
            alert(t("comment.report_error"));
            return;
        }

        closeModal();
        alert(t("comment.report_success"));
    } catch (err) {
        alert(t("comment.report_error"));
    } finally {
        isReporting.value = false;
    }
}

// Delete comment function
async function confirmDelete() {
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
            alert(t("comment.delete_error"));
            return;
        }

        closeModal();
    } catch (err) {
        alert(t("comment.delete_error"));
    } finally {
        isDeleting.value = false;
    }
}

// Function to log in when clicking the login button
function loginToComment() {
    login();
}

// Event handlers for keyboard events
const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && activeModal.value) {
        closeModal();
    }
};

// Fetch comments and set up event listeners on mount
onMounted(() => {
    // Fetch initial comments
    fetchComments();

    // Initialize client-side functionality
    if (import.meta.client) {
        // Handle fragment navigation after a short delay to ensure DOM is ready
        setTimeout(() => {
            scrollToCommentFragment();
            // Re-fetch comments after a short delay to ensure hydration is complete
            setTimeout(() => {
                if (comments.value.length === 0) {
                    fetchComments();
                }
            }, 500);
        }, 100);
    }

    // Add keyboard event listener for modals
    window.addEventListener("keydown", handleKeyDown);
});

// Watch for changes in killId and refetch comments if needed
watch(() => props.killId, (newKillId, oldKillId) => {
    if (newKillId && newKillId !== oldKillId) {
        comments.value = []; // Clear existing comments
        commentsLoaded.value = false;
        fetchComments();
    }
}, { immediate: false });

// Lifecycle hooks for WebSocket management during component activation/deactivation
onActivated(() => {
    resumeWs();
});

onDeactivated(() => {
    pauseWs();
});

// Complete cleanup on unmount
onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeyDown);
});
</script>

<style scoped>
.section {
    padding: 0.85rem;
    border-radius: 0.5rem;
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

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
    text-decoration: underline;
}

.entity-details {
    min-width: 0;
    flex-grow: 1;
    width: calc(100% - 60px);
}

.border-light-dark-border {
    border-color: light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

.text-light-dark-secondary {
    color: light-dark(#6b7280, #9ca3af);
}

.bg-light-dark-tab {
    background-color: light-dark(rgba(229, 231, 235, 0.1), rgba(55, 65, 81, 0.5));
}

.bg-light-dark-input {
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(31, 41, 55, 0.5));
}

.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}

.editor-container {
    border: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
    border-radius: 0.5rem;
    padding: 0.5rem;
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(31, 41, 55, 0.3));
    min-height: 200px;
    /* Base minimum height */
    transition: none;
    /* Disable transitions to prevent animation during typing */
}

.editor-toolbar {
    border-top: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
    padding-top: 0.5rem;
    margin-top: 0.5rem;
}

.preview-container {
    border-color: light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
    min-height: 200px;
    /* Match editor height */
    overflow-y: auto;
    /* Allow scrolling if content is taller */
    transition: none;
    /* Disable transitions to prevent animation during tab switching */
}

.selected-comment {
    transform: scale(1.01);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Modal styles */
.custom-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 0.5rem;
    z-index: 10;
}

.custom-modal {
    width: 90%;
    max-width: 500px;
    background: light-dark(white, #1e1e1e);
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    overflow: hidden;
}

.custom-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid light-dark(#e5e7eb, #2d3748);
}

.modal-close-btn {
    padding: 0.25rem;
    border-radius: 0.375rem;
    color: light-dark(#6b7280, #a0aec0);
    transition: color 0.2s, background-color 0.2s;
}

.modal-close-btn:hover {
    color: light-dark(#1f2937, #f7fafc);
    background-color: light-dark(#f3f4f6, #374151);
}

.custom-modal-body {
    padding: 1rem;
}

.custom-modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 1rem;
    gap: 0.75rem;
    border-top: 1px solid light-dark(#e5e7eb, #2d3748);
}

/* Animation */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

/* Blur effect for the comment when modal is active */
.blur-sm {
    filter: blur(4px);
    transition: filter 0.3s ease;
}

/* Comment highlight effect for navigation */
:deep(.highlighted-comment) {
    animation: highlight-pulse 2s ease-in-out;
}

@keyframes highlight-pulse {
    0% {
        background-color: transparent;
    }

    30% {
        background-color: rgba(79, 195, 247, 0.2);
    }

    100% {
        background-color: transparent;
    }
}
</style>
