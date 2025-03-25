<template>
  <div class="overflow-x-auto">
    <!-- Display existing comments -->
    <div v-for="comment in comments" :key="comment.identifier"
         class="comment section mb-4 relative"
         :id="`comment-${comment.identifier}`">

      <!-- Comment content -->
      <div class="flex flex-col" :class="{ 'blur-sm': activeModal && activeComment === comment.identifier }">
        <!-- Comment header with user info -->
        <div class="flex items-center mb-3 pb-2 border-b border-light-dark-border">
          <NuxtLink :to="`/character/${comment.characterId}`" class="flex-shrink-0">
            <UAvatar
              :src="`https://images.evetech.net/characters/${comment.characterId}/portrait?size=64`"
              :alt="comment.characterName"
              size="md"
              class="mr-3"
            />
          </NuxtLink>
          <div class="entity-details">
            <NuxtLink :to="`/character/${comment.characterId}`" class="entity-link entity-name primary">
              {{ comment.characterName }}
            </NuxtLink>
            <div class="entity-name secondary">
              <template v-if="comment.corporationName">
                <NuxtLink v-if="comment.corporationId" :to="`/corporation/${comment.corporationId}`" class="entity-link truncate">
                  {{ comment.corporationName }}
                </NuxtLink>
                <span v-if="comment.allianceName" class="truncate">
                  /
                  <NuxtLink v-if="comment.allianceId" :to="`/alliance/${comment.allianceId}`" class="entity-link truncate">
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
              <button
                v-if="currentUser?.characterId !== comment.characterId"
                class="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Report comment"
                @click="openReportModal(comment.identifier)"
              >
                <Icon name="lucide:flag" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>

              <!-- Delete button - only for admin or comment author -->
              <button
                v-if="isAdministrator || currentUser?.characterId === comment.characterId"
                class="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Delete comment"
                @click="openDeleteModal(comment.identifier)"
              >
                <Icon name="lucide:x" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        <div class="markdown-content prose prose-sm dark:prose-invert w-full" v-html="renderMarkdown(comment.comment)"></div>
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
              <textarea
                v-model="reportMessage"
                class="w-full border rounded-md p-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                rows="4"
                :placeholder="$t('comment.report_placeholder')"
                @keydown.esc="closeModal"
                ref="reportTextarea"
              ></textarea>
            </div>

            <div class="custom-modal-footer">
              <button
                @click="closeModal"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                @click="submitReport"
                :disabled="!reportMessage.trim() || isReporting"
                class="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isReporting ? $t('common.loading') : $t('comment.submit_report') }}
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
              <button
                @click="closeModal"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                @click="confirmDelete()"
                :disabled="isDeleting"
                class="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isDeleting ? $t('common.loading') : $t('comment.confirm_delete') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="comments.length === 0" class="section mb-4 text-center py-8">
      <div class="text-light-dark-secondary">{{ $t('comment.no_comments') }}</div>
    </div>

    <!-- WebSocket connection status indicator -->
    <div v-if="!wsConnected" class="text-xs text-amber-500 mb-2 flex items-center justify-end gap-1">
      <div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
      <span>{{ $t('killList.wsReconnecting', { attempt: wsReconnectAttempts, max: MAX_RECONNECT_ATTEMPTS }) }}</span>
    </div>

    <!-- Comment Input Box for authenticated users -->
    <div v-if="isAuthenticated" class="section mb-4">
      <!-- Comment header with user info -->
      <div class="flex items-center mb-3 pb-2 border-b border-light-dark-border">
        <NuxtLink :to="`/character/${currentUser.characterId}`" class="flex-shrink-0">
          <UAvatar
            :src="`https://images.evetech.net/characters/${currentUser.characterId}/portrait?size=64`"
            :alt="currentUser.characterName"
            size="md"
            class="mr-3"
          />
        </NuxtLink>
        <div class="entity-details">
          <NuxtLink :to="`/character/${currentUser.characterId}`" class="entity-link entity-name primary">
            {{ currentUser.characterName }}
          </NuxtLink>
          <div v-if="currentUser.corporationName" class="entity-name secondary">
            <NuxtLink v-if="currentUser.corporationId" :to="`/corporation/${currentUser.corporationId}`" class="entity-link truncate">
              {{ currentUser.corporationName }}
            </NuxtLink>
            <span v-if="currentUser.allianceName" class="truncate">
              /
              <NuxtLink v-if="currentUser.allianceId" :to="`/alliance/${currentUser.allianceId}`" class="entity-link truncate">
                {{ currentUser.allianceName }}
              </NuxtLink>
              <span v-else>{{ currentUser.allianceName }}</span>
            </span>
          </div>
        </div>

        <!-- Tab switcher in the top right -->
        <div class="ml-auto">
          <div class="flex border border-light-dark-border rounded-md overflow-hidden">
            <button
              @click="activeTab = 'write'"
              class="px-3 py-1 text-xs"
              :class="activeTab === 'write' ? 'bg-primary-500 text-white' : 'bg-light-dark-tab text-light-dark-secondary'"
            >
              {{ $t('markdown_editor.write') }}
            </button>
            <button
              @click="activeTab = 'preview'"
              class="px-3 py-1 text-xs"
              :class="activeTab === 'preview' ? 'bg-primary-500 text-white' : 'bg-light-dark-tab text-light-dark-secondary'"
            >
              {{ $t('markdown_editor.preview') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Editor container -->
      <div class="w-full">
        <!-- Write tab -->
        <div v-show="activeTab === 'write'" class="editor-container">
          <UTextarea
            v-model="newComment"
            :rows="6"
            class="w-full mb-2 font-mono bg-light-dark-input border-light-dark-border"
            :disabled="isSubmitting"
            :placeholder="$t('markdown_editor.placeholder')"
            @input="updateEditorHeight"
          />

          <div class="editor-toolbar flex flex-wrap gap-2 mb-2">
            <UButton size="xs" @click="insertMarkdown('**', '**')" color="gray">
              <Icon name="lucide:bold" class="w-4 h-4 mr-1" />
              {{ $t('markdown_editor.bold') }}
            </UButton>
            <UButton size="xs" @click="insertMarkdown('*', '*')" color="gray">
              <Icon name="lucide:italic" class="w-4 h-4 mr-1" />
              {{ $t('markdown_editor.italic') }}
            </UButton>
            <UButton size="xs" @click="insertMarkdown('[', '](url)')" color="gray">
              <Icon name="lucide:link" class="w-4 h-4 mr-1" />
              {{ $t('markdown_editor.link') }}
            </UButton>
            <UButton size="xs" @click="insertMarkdown('\n```\n', '\n```')" color="gray">
              <Icon name="lucide:code" class="w-4 h-4 mr-1" />
              {{ $t('markdown_editor.code') }}
            </UButton>
            <UButton size="xs" @click="insertImage" color="gray">
              <Icon name="lucide:image" class="w-4 h-4 mr-1" />
              {{ $t('markdown_editor.image') }}
            </UButton>
            <UButton size="xs" @click="insertYoutube" color="gray">
              <Icon name="lucide:video" class="w-4 h-4 mr-1" />
              {{ $t('markdown_editor.youtube') }}
            </UButton>
            <UButton size="xs" @click="insertImgur" color="gray">
              <Icon name="simple-icons:imgur" class="w-4 h-4 mr-1" />
              {{ $t('markdown_editor.imgur') }}
            </UButton>
            <UButton size="xs" @click="insertGiphy" color="gray">
              <Icon name="simple-icons:giphy" class="w-4 h-4 mr-1" />
              {{ $t('markdown_editor.giphy') }}
            </UButton>
            <UButton size="xs" @click="insertTenor" color="gray">
              <Icon name="simple-icons:tenor" class="w-4 h-4 mr-1" />
              {{ $t('markdown_editor.tenor') }}
            </UButton>
          </div>
        </div>

        <!-- Preview tab -->
        <div
          v-show="activeTab === 'preview'"
          class="preview-container border rounded-md p-3 mb-3 prose prose-sm dark:prose-invert bg-light-dark-input"
          ref="previewContainerRef"
        >
          <div v-html="renderMarkdown(newComment)" v-if="newComment.trim()"></div>
          <div v-else class="text-light-dark-secondary text-sm italic">{{ $t('markdown_editor.preview_empty') }}</div>
        </div>
      </div>

      <div class="flex justify-between mt-3">
        <p class="text-xs text-light-dark-secondary" :class="{ 'text-red-500': charactersRemaining < 0 }">
          {{ charactersRemaining }} {{ $t('characters_remaining') }}
        </p>
        <UButton
          :loading="isSubmitting"
          :disabled="isSubmittingDisabled"
          @click="postComment"
          color="primary"
          size="sm"
        >
          {{ $t('post_comment') }}
        </UButton>
      </div>

      <p v-if="errorMessage" class="text-red-500 text-sm mt-2">{{ errorMessage }}</p>
    </div>

    <!-- Login prompt for unauthenticated users -->
    <div v-else class="section mb-4 text-center py-4">
      <p class="mb-2">{{ $t('login_to_comment') }}</p>
      <UButton color="primary" @click="loginToComment">{{ $t('login') }}</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/src/theme/modern/composables/useAuth';
import { useI18n } from 'vue-i18n';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Create a global ref for tracking websocket instances
// This helps prevent multiple connections on the same page
const globalWsRef = ref<{socket: WebSocket | null, count: number}>({socket: null, count: 0});

const { t } = useI18n();
const route = useRoute();
const { isAuthenticated, currentUser, login } = useAuth();

// Props
const props = defineProps({
  killId: {
    type: Number,
    required: true
  }
});

// State
const comments = ref([]);
const newComment = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');
const lastPostedComment = ref('');
const commentLimit = 1000;
const activeTab = ref('write'); // 'write' or 'preview'
const charactersRemaining = computed(() => commentLimit - newComment.value.length);
const killIdentifier = computed(() => `kill:${props.killId}`);

// WebSocket State
const wsConnected = ref(false);
const wsSocket = ref<WebSocket | null>(null);
const wsReconnectAttempts = ref(0);
const MAX_RECONNECT_ATTEMPTS = 5;
const wsReconnectTimeout = ref<NodeJS.Timeout | null>(null);

// Fix layout juddering
const editorContainerHeight = ref<number | null>(null);
const textareaHeight = ref<number | null>(null);
const previewContainerRef = ref<HTMLElement | null>(null);

// Modal state
const activeModal = ref<'report' | 'delete' | null>(null);
const activeComment = ref<string | null>(null);
const reportMessage = ref('');
const isDeleting = ref(false);
const isReporting = ref(false);
const reportTextarea = ref<HTMLTextAreaElement | null>(null);

// Configure markdown with custom renderers
const renderer = new marked.Renderer();
const originalLink = renderer.link;

/**
 * Fetch and process Imgur JSON data directly
 */
async function fetchImgurData(url: string): Promise<{url: string, type: string} | null> {
  try {
    // Convert URL to JSON endpoint
    const jsonUrl = convertImgurToJsonUrl(url);

    // Fetch the JSON data
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store' // Avoid caching
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Validate response data
    if (!data?.data?.image) {
      return null;
    }

    // Extract media information
    return extractImgurMedia(data.data.image);
  } catch (error) {
    return null;
  }
}

/**
 * Convert a regular Imgur URL to its JSON API endpoint
 */
function convertImgurToJsonUrl(url: string): string {
  // Remove query parameters and hash fragments
  const cleanUrl = url.split(/[?#]/)[0].replace(/\/+$/, '');

  // Handle direct i.imgur.com links
  if (cleanUrl.includes('i.imgur.com/')) {
    const hash = cleanUrl.split('/').pop()?.split('.')[0];
    if (hash) {
      return `https://imgur.com/gallery/${hash}.json`;
    }
  }

  // Add .json if needed
  if (!cleanUrl.endsWith('.json')) {
    return `${cleanUrl}.json`;
  }

  return cleanUrl;
}

/**
 * Extract media information from Imgur JSON data
 */
function extractImgurMedia(imageData: any): {url: string, type: string} | null {
  try {
    // For albums, get the first image
    if (imageData.is_album && imageData.album_images?.images?.length > 0) {
      const firstImage = imageData.album_images.images[0];
      const hash = firstImage.hash;
      const ext = firstImage.ext || '.jpg';

      // Determine media type
      let type = 'image';
      if (ext === '.mp4' || ext === '.webm' || firstImage.has_sound) {
        type = 'video';
      } else if (firstImage.animated) {
        type = firstImage.prefer_video ? 'video' : 'gif';
      }

      return {
        url: `https://i.imgur.com/${hash}${ext}`,
        type
      };
    }
    // For single images
    else {
      const hash = imageData.album_cover || imageData.hash;
      const ext = imageData.ext || '.jpg';

      // Determine media type
      let type = 'image';
      if (ext === '.mp4' || ext === '.webm' || imageData.has_sound) {
        type = 'video';
      } else if (imageData.animated) {
        type = imageData.prefer_video ? 'video' : 'gif';
      }

      return {
        url: `https://i.imgur.com/${hash}${ext}`,
        type
      };
    }
  } catch (error) {
    return null;
  }
}

// Create a map to store processed Imgur content to avoid duplicates
const processedImgurContent = new Map<string, {url: string, type: string}>();

// Create a reactive map to store resolved Imgur URLs with media type information
const resolvedImgurMedia = ref(new Map<string, {url: string, type: string}>());

// Function to resolve an Imgur gallery/album URL to its media
async function resolveImgurUrl(url: string): Promise<{url: string, type: string} | null> {
  try {
    // Generate a unique cache key for this specific URL
    const cacheKey = url.trim();

    // Don't re-fetch URLs we've already resolved in this session
    if (resolvedImgurMedia.value.has(cacheKey)) {
      return resolvedImgurMedia.value.get(cacheKey) || null;
    }

    // Use server proxy to fetch Imgur data (avoids CORS issues)
    const { data, error } = await useFetch('/api/proxy/imgur', {
      method: 'POST',
      body: { url: cacheKey },
      headers: {
        'Content-Type': 'application/json'
      },
      // Critical: Tell useFetch not to deduplicate or cache the request
      key: `imgur-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      cache: 'no-store'
    });

    if (error.value) {
      return null;
    }

    if (data.value && data.value.mediaUrl) {
      const result = {
        url: data.value.mediaUrl,
        type: data.value.mediaType || 'image'
      };

      // Cache the resolved media info in the component
      resolvedImgurMedia.value.set(cacheKey, result);

      return result;
    }

    return null;
  } catch (error) {
    return null;
  }
}

renderer.link = (href, title, text) => {
  // Check if it's a YouTube link
  const youtubeMatch = href.match(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/) ||
                        href.match(/^https?:\/\/(www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/);

  // Simplified Imgur regex patterns
  // Direct imgur image
  const imgurDirectMatch = href.match(/^https?:\/\/(i\.)?imgur\.com\/([a-zA-Z0-9]+)(\.(jpeg|jpg|png|gif|mp4|webm))?$/i);

  // Imgur gallery or album - any gallery URL pattern
  const imgurGalleryMatch = href.match(/^https?:\/\/(www\.)?imgur\.com\/(gallery|a)\/([^\/\s]+)/i);

  // Check if it's a Giphy link
  const giphyMatch = href.match(/^https?:\/\/(www\.)?giphy\.com\/gifs\/([a-zA-Z0-9]+-)*([a-zA-Z0-9]+)/) ||
                      href.match(/^https?:\/\/media[0-9]?\.giphy\.com\/media\/([a-zA-Z0-9]+)/);

  // Check if it's a Tenor link
  const tenorMatch = href.match(/^https?:\/\/(www\.)?tenor\.com\/view\/[a-zA-Z0-9-]+-([0-9]+)/);

  // Check if it's an image link
  const imageMatch = href.match(/\.(jpeg|jpg|gif|png)$/i);
  // Check if it's a video link
  const videoMatch = href.match(/\.(mp4|webm)$/i);

  if (youtubeMatch) {
    const videoId = youtubeMatch[2];
    return `<div class="video-container">
              <iframe width="100%" height="315"
                src="https://www.youtube.com/embed/${videoId}"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
              </iframe>
            </div>`;
  }
  else if (imgurDirectMatch) {
    // Direct image/video from i.imgur.com
    const imgurId = imgurDirectMatch[2];
    const extension = imgurDirectMatch[3] || '.jpg'; // Default to jpg if no extension

    // Check if it's a video
    if (extension.match(/\.(mp4|webm)$/i)) {
      return `<div class="video-container">
                <video autoplay loop muted playsinline controls class="max-w-full">
                  <source src="https://i.imgur.com/${imgurId}${extension}" type="video/mp4">
                  Your browser doesn't support HTML5 video.
                </video>
                <div class="media-source">
                  <a href="${href}" target="_blank" rel="noopener noreferrer" class="source-link">
                    <span class="flex items-center"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16V5c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11 5v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1zm7 0v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1z"></path></svg>View on Imgur</span>
                  </a>
                </div>
              </div>`;
    } else {
      return `<div class="image-container">
                <img src="https://i.imgur.com/${imgurId}${extension}" alt="Imgur Image" class="max-w-full h-auto" />
                <div class="media-source">
                  <a href="${href}" target="_blank" rel="noopener noreferrer" class="source-link">
                    <span class="flex items-center"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16V5c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11 5v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1zm7 0v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1z"></path></svg>View on Imgur</span>
                  </a>
                </div>
              </div>`;
    }
  }
  else if (imgurGalleryMatch) {
    // For gallery or album links, we'll use a placeholder and replace it after we get the media URL
    const uniqueId = `imgur-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const originalUrl = href; // Store the original URL

    // Create an async function to fetch and update the media URL later
    nextTick(async () => {
      const placeholder = document.getElementById(uniqueId);
      if (!placeholder) return;

      // Show loading state
      placeholder.innerHTML = `<div class="flex items-center justify-center p-4">
                              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                              <span class="ml-2">Loading content from Imgur...</span>
                            </div>`;

      try {
        // Use the proxy to fetch the media data
        const media = await resolveImgurUrl(originalUrl);

        // Update the placeholder with the resolved media
        if (placeholder) {
          if (media) {
            if (media.type === 'video') {
              placeholder.innerHTML = `<video autoplay loop muted playsinline controls class="max-w-full">
                                      <source src="${media.url}" type="video/mp4">
                                      Your browser doesn't support HTML5 video.
                                     </video>`;
            } else if (media.type === 'gif') {
              placeholder.innerHTML = `<img src="${media.url}" alt="Imgur GIF" class="max-w-full h-auto" />`;
            } else {
              placeholder.innerHTML = `<img src="${media.url}" alt="Imgur Image" class="max-w-full h-auto" />`;
            }
          } else {
            placeholder.innerHTML = `<div class="p-4 text-center">
                                    <p>Imgur content could not be loaded</p>
                                    <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="text-primary-500">View on Imgur</a>
                                   </div>`;
          }
        }
      } catch (error) {
        if (placeholder) {
          placeholder.innerHTML = `<div class="p-4 text-center">
                                  <p>Error loading Imgur content</p>
                                  <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="text-primary-500">View on Imgur</a>
                                 </div>`;
        }
      }
    });

    return `<div class="media-container">
            <div id="${uniqueId}" class="imgur-content bg-light-dark-input rounded-md min-h-32 flex items-center justify-center" data-url="${originalUrl}">
              <span>Loading Imgur content...</span>
            </div>
            <div class="media-source">
              <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="source-link">
                <span class="flex items-center"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16V5c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11 5v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1zm7 0v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1z"></path></svg>View on Imgur</span>
              </a>
            </div>
          </div>`;
  }
  else if (videoMatch) {
    // Regular video link
    return `<div class="video-container">
              <video autoplay loop muted playsinline controls class="max-w-full">
                <source src="${href}" type="video/mp4">
                Your browser doesn't support HTML5 video.
              </video>
            </div>`;
  }
  else if (giphyMatch) {
    const giphyId = giphyMatch[3] || giphyMatch[1];
    return `<div class="gif-container">
              <img src="https://media.giphy.com/media/${giphyId}/giphy.gif" alt="GIPHY" class="max-w-full h-auto" />
              <div class="media-source">
                <a href="${href}" target="_blank" rel="noopener noreferrer" class="source-link">
                  <span class="flex items-center"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M2.666 0v24h18.668V0H2.666zm16.668 22H4.666V2h14.668v20zm-4.335-5.917a1.458 1.458 0 0 1-1.458 1.458h-4.083a1.458 1.458 0 0 1-1.458-1.458V10a1.458 1.458 0 0 1 1.458-1.458h4.083A1.458 1.458 0 0 1 15 10v6.083z"></path></svg>View on GIPHY</span>
                </a>
              </div>
            </div>`;
  }
  else if (tenorMatch) {
    const tenorId = tenorMatch[2];
    return `<div class="gif-container">
              <iframe src="https://tenor.com/embed/${tenorId}" frameBorder="0" width="100%" height="300px"></iframe>
              <div class="media-source">
                <a href="${href}" target="_blank" rel="noopener noreferrer" class="source-link">
                  <span class="flex items-center"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M19.975 8.484L5.717 2.677a.421.421 0 0 0-.58.557l2.879 6.172a.41.41 0 0 1 0 .338L5.16 15.982a.422.422 0 0 0 .58.558l14.257-5.807a.422.422 0 0 0 0-.783l-.022-.466z"></path></svg>View on Tenor</span>
                </a>
              </div>
            </div>`;
  }
  else if (imageMatch) {
    return `<div class="image-container">
              <img src="${href}" alt="${text}" class="max-w-full h-auto" />
            </div>`;
  }

  // Default link processing (open in new tab with security attributes)
  return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.use({ renderer });

// Computed
const isSubmittingDisabled = computed(() => {
  return isSubmitting.value ||
    newComment.value.trim() === '' ||
    charactersRemaining.value < 0 ||
    newComment.value.trim() === lastPostedComment.value;
});

// Methods
function getInfoString(corporationName: string, allianceName?: string) {
  if (corporationName && allianceName) {
    return `${corporationName} / ${allianceName}`;
  } else if (corporationName) {
    return corporationName;
  }
  return '';
}

function formatDate(dateString: string) {
  if (!dateString) return '';

  const date = new Date(dateString);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function renderMarkdown(text: string): string {
  if (!text) return '';

  // Convert markdown to HTML and sanitize
  const rawHTML = marked(text);
  return DOMPurify.sanitize(rawHTML, {
    ADD_TAGS: ['iframe', 'blockquote', 'script', 'video', 'source'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'rel', 'async',
               'charset', 'data-id', 'lang', 'controls', 'loop', 'muted', 'playsinline', 'type', 'src']
  });
}

function insertMarkdown(prefix: string, suffix: string) {
  const textarea = document.querySelector('textarea');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selection = newComment.value.substring(start, end);

  newComment.value =
    newComment.value.substring(0, start) +
    prefix + selection + suffix +
    newComment.value.substring(end);

  // Set cursor position to right after the inserted text
  nextTick(() => {
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + prefix.length + selection.length;
  });
}

function insertImage() {
  const url = prompt(t('markdown_editor.image_url_prompt'), 'https://');
  if (url) {
    const markdown = `![Image](${url})`;
    insertTextAtCursor(markdown);
  }
}

function insertYoutube() {
  const url = prompt(t('markdown_editor.youtube_url_prompt'), 'https://www.youtube.com/watch?v=');
  if (url) {
    insertTextAtCursor(url);
  }
}

function insertImgur() {
  const url = prompt(t('markdown_editor.imgur_url_prompt'), 'https://imgur.com/');
  if (url) {
    insertTextAtCursor(url);
  }
}

function insertGiphy() {
  const url = prompt(t('markdown_editor.giphy_url_prompt'), 'https://giphy.com/gifs/');
  if (url) {
    insertTextAtCursor(url);
  }
}

function insertTenor() {
  const url = prompt(t('markdown_editor.tenor_url_prompt'), 'https://tenor.com/view/');
  if (url) {
    insertTextAtCursor(url);
  }
}

function insertTextAtCursor(text: string) {
  const textarea = document.querySelector('textarea');
  if (!textarea) return;

  const start = textarea.selectionStart;
  newComment.value =
    newComment.value.substring(0, start) +
    text +
    newComment.value.substring(start);
}

async function fetchComments() {
  try {
    const { data, error } = await useFetch(`/api/comments/${killIdentifier.value}`);

    if (error.value) {
      return;
    }

    comments.value = data.value || [];
  } catch (err) {
  }
}

async function postComment() {
  if (isSubmittingDisabled.value) return;

  // Check for duplicate comment
  if (newComment.value.trim() === lastPostedComment.value) {
    errorMessage.value = t('duplicate_comment_error');
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    // Post JSON data to the API
    const { data, error } = await useFetch(`/api/comments/${killIdentifier.value}`, {
      method: 'POST',
      body: {
        comment: newComment.value.trim()
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (error.value) {
      // Extract just the relevant part of the error message
      if (error.value.message) {
        // Parse error message to extract just the content after the status code
        const match = error.value.message.match(/\d{3}\s+(.*)/);
        errorMessage.value = match ? match[1] : error.value.message;

        // If the error is about moderation, format it nicely
        if (errorMessage.value.includes('potentially harmful content')) {
          const moderationMatch = errorMessage.value.match(/Comment contains potentially harmful content.*?$/);
          if (moderationMatch) {
            errorMessage.value = moderationMatch[0];
          }
        }
      } else {
        errorMessage.value = t('comment_post_error');
      }
      return;
    }

    // Don't need to manually add the comment here anymore
    // as the WebSocket will send us the update
    lastPostedComment.value = newComment.value.trim();
    newComment.value = '';
    activeTab.value = 'write';  // Reset to write tab after posting
  } catch (err) {
    errorMessage.value = t('comment_post_error');
  } finally {
    isSubmitting.value = false;
  }
}

// Fix layout juddering when typing
function updateEditorHeight() {
  nextTick(() => {
    const textarea = document.querySelector('.editor-container textarea');

    if (textarea && !textareaHeight.value) {
      // Save initial height when first loaded
      textareaHeight.value = textarea.clientHeight;

      // Also save the container height
      const container = document.querySelector('.editor-container');
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

// Initialize WebSocket connection
function initWebSocket() {
  try {
    // If there's already a global socket connection, use it
    if (globalWsRef.value.socket && globalWsRef.value.socket.readyState === WebSocket.OPEN) {
      wsSocket.value = globalWsRef.value.socket;
      wsConnected.value = true;
      globalWsRef.value.count++;
      return;
    }

    // If there's a socket but it's closing, wait a moment and try again
    if (globalWsRef.value.socket && globalWsRef.value.socket.readyState === WebSocket.CLOSING) {
      setTimeout(() => initWebSocket(), 500);
      return;
    }

    const socket = new WebSocket('/comments');
    wsSocket.value = socket;
    globalWsRef.value.socket = socket;
    globalWsRef.value.count++;

    socket.onopen = () => {
      wsConnected.value = true;
      wsReconnectAttempts.value = 0;
    };

    socket.onclose = (event) => {
      wsConnected.value = false;

      // Only attempt to reconnect from one instance
      if (globalWsRef.value.socket === socket) {
        // Reset the global reference
        globalWsRef.value.socket = null;

        // Attempt to reconnect with exponential backoff
        if (wsReconnectAttempts.value < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts.value), 10000);
          wsReconnectTimeout.value = setTimeout(() => {
            wsReconnectAttempts.value++;
            initWebSocket();
          }, delay);
        }
      }
    };

    socket.onerror = (error) => {
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Process event based on type
        if (data.eventType === 'new') {
          handleNewComment(data.comment);
        } else if (data.eventType === 'deleted') {
          handleDeletedComment(data.comment);
        }
      } catch (err) {
      }
    };
  } catch (err) {
  }
}

// Handler functions for WebSocket events
function handleNewComment(comment: any) {
  // Only process if this comment is for the current kill
  if (comment.killIdentifier === killIdentifier.value) {
    // Check if we don't already have this comment (prevent duplicates)
    if (!comments.value.some(c => c.identifier === comment.identifier)) {
      // Add to beginning of array (newest first)
      comments.value = [comment, ...comments.value];
    }
  }
}

function handleDeletedComment(comment: any) {
  // Only process if this comment is for the current kill
  if (comment.killIdentifier === killIdentifier.value) {
    // Remove the deleted comment from the list
    comments.value = comments.value.filter(c => c.identifier !== comment.identifier);
  }
}

// Add onMounted hook to fetch comments when component initializes
onMounted(() => {
  fetchComments();
});

// Fix for layout juddering
updateEditorHeight();

// Add Imgur embed script to handle album embeds after removing the script tag from the template
if (window && !document.getElementById('imgur-embed-script')) {
  const imgurScript = document.createElement('script');
  imgurScript.id = 'imgur-embed-script';
  imgurScript.async = true;
  imgurScript.src = '//s.imgur.com/min/embed.js';
  document.head.appendChild(imgurScript);
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && activeModal.value) {
    closeModal();
  }
};

window.addEventListener('keydown', handleKeyDown);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);

  // Clean up WebSocket
  if (wsSocket.value) {
    // Decrement the reference count
    if (globalWsRef.value.count > 0) {
      globalWsRef.value.count--;
    }

    // Only close the socket if this is the last instance using it
    if (globalWsRef.value.count === 0 && globalWsRef.value.socket) {
      globalWsRef.value.socket.close();
      globalWsRef.value.socket = null;
      wsSocket.value = null;
    }
  }

  if (wsReconnectTimeout.value) {
    clearTimeout(wsReconnectTimeout.value);
    wsReconnectTimeout.value = null;
  }
});

// Watch for tab changes and update preview height
watch(activeTab, () => {
  updateEditorHeight();
});

// Add to existing computed properties
const isAdministrator = computed(() => currentUser.value?.administrator === true);

// Modal control functions
function openReportModal(identifier: string) {
  activeComment.value = identifier;
  activeModal.value = 'report';
  reportMessage.value = '';

  nextTick(() => {
    if (reportTextarea.value) {
      reportTextarea.value.focus();
    }
  });
}

function openDeleteModal(identifier: string) {
  activeComment.value = identifier;
  activeModal.value = 'delete';
}

function closeModal() {
  activeModal.value = null;
  activeComment.value = null;
  reportMessage.value = '';
}

// Submit comment report to the API
async function submitReport() {
  if (!reportMessage.value.trim() || !activeComment.value || isReporting.value) return;

  isReporting.value = true;

  try {
    const { data, error } = await useFetch('/api/comments/report', {
      method: 'POST',
      body: {
        identifier: activeComment.value,
        reportMessage: reportMessage.value.trim()
      }
    });

    if (error.value) {
      alert(t('comment.report_error'));
      return;
    }

    closeModal();
    alert(t('comment.report_success'));
  } catch (err) {
    alert(t('comment.report_error'));
  } finally {
    isReporting.value = false;
  }
}

// Delete comment function
async function confirmDelete() {
  if (!activeComment.value || isDeleting.value) return;

  isDeleting.value = true;

  try {
    const { data, error } = await useFetch('/api/comments/delete', {
      method: 'POST',
      body: {
        identifier: activeComment.value
      }
    });

    if (error.value) {
      alert(t('comment.delete_error'));
      return;
    }

    closeModal();
  } catch (err) {
    alert(t('comment.delete_error'));
  } finally {
    isDeleting.value = false;
  }
}

// Function to log in when clicking the login button
function loginToComment() {
  login();
}

// Initialize the component
onMounted(() => {
  fetchComments();

  if (import.meta.client) {
    initWebSocket();
  }
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

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.markdown-content :deep(iframe) {
  width: 100%;
  aspect-ratio: 16/9;
  max-width: 560px;
}

.markdown-content :deep(a) {
  color: #4fc3f7;
  text-decoration: underline;
}

.markdown-content :deep(pre) {
  background-color: light-dark(rgba(229, 231, 235, 0.1), rgba(31, 41, 55, 0.5));
  padding: 0.75rem;
  border-radius: 0.375rem;
  overflow-x: auto;
}

.markdown-content :deep(code) {
  font-family: ui-monospace, monospace;
}

.video-container, .gif-container {
  position: relative;
  width: 100%;
  max-width: 560px;
  margin: 1em auto;
}

.image-container, .embed-container {
  margin: 1em 0;
  position: relative;
}

.media-source {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  text-align: right;
}

.source-link {
  display: inline-flex;
  align-items: center;
  color: #9ca3af;
  text-decoration: none;
}

.source-link:hover {
  color: #4fc3f7;
  text-decoration: underline;
}

.editor-container {
  border: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
  border-radius: 0.5rem;
  padding: 0.5rem;
  background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(31, 41, 55, 0.3));
}

.editor-toolbar {
  border-top: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}

.preview-container {
  border-color: light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

.video-container video {
  max-width: 100%;
  max-height: 80vh;
  margin: 0 auto;
  display: block;
}

.media-container {
  margin: 1em 0;
  position: relative;
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

/* Fix for editor juddering */
.editor-container {
  min-height: 200px; /* Base minimum height */
  transition: none; /* Disable transitions to prevent animation during typing */
}

.preview-container {
  min-height: 200px; /* Match editor height */
  overflow-y: auto; /* Allow scrolling if content is taller */
  transition: none; /* Disable transitions to prevent animation during tab switching */
}

/* WebSocket status styles */
.websocket-status {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.connected {
  background-color: #10b981;
}

.disconnected {
  background-color: #f59e0b;
}

.error {
  background-color: #ef4444;
}
</style>
