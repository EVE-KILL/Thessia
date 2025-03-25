<template>
  <div class="overflow-x-auto">
    <!-- Display existing comments -->
    <div v-for="comment in comments" :key="comment.identifier" class="comment section mb-4">
      <div class="flex flex-col">
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
          <div class="ml-auto text-xs text-light-dark-secondary">
            {{ formatDate(comment.createdAt) }}
          </div>
        </div>

        <!-- Comment content -->
        <div class="markdown-content prose prose-sm dark:prose-invert w-full" v-html="renderMarkdown(comment.comment)"></div>
      </div>
    </div>

    <div v-if="comments.length === 0" class="section mb-4 text-center py-8">
      <div class="text-light-dark-secondary">No comments yet. Be the first to comment!</div>
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
          </div>
        </div>

        <!-- Preview tab -->
        <div v-show="activeTab === 'preview'" class="preview-container border rounded-md p-3 mb-3 prose prose-sm dark:prose-invert bg-light-dark-input">
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

const { t } = useI18n();
const route = useRoute();
const { isAuthenticated, currentUser, login } = useAuth();

// Props
const props = defineProps({
  killId: {
    type: String,
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

// Configure markdown with custom renderers
const renderer = new marked.Renderer();
const originalLink = renderer.link;

renderer.link = (href, title, text) => {
  // Check if it's a YouTube link
  const youtubeMatch = href.match(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/) ||
                        href.match(/^https?:\/\/(www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/);

  // Check if it's an image link
  const imageMatch = href.match(/\.(jpeg|jpg|gif|png)$/i);

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
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'rel']
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
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    newComment.value =
      newComment.value.substring(0, start) +
      markdown +
      newComment.value.substring(start);
  }
}

function insertYoutube() {
  const url = prompt(t('markdown_editor.youtube_url_prompt'), 'https://www.youtube.com/watch?v=');
  if (url) {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    newComment.value =
      newComment.value.substring(0, start) +
      url +
      newComment.value.substring(start);
  }
}

async function fetchComments() {
  try {
    const { data, error } = await useFetch(`/api/comments/${killIdentifier.value}`);

    if (error.value) {
      console.error('Failed to fetch comments:', error.value);
      return;
    }

    comments.value = data.value || [];
  } catch (err) {
    console.error('Error fetching comments:', err);
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
      errorMessage.value = error.value.message || t('comment_post_error');
      return;
    }

    // Add the new comment to the list and clear the input
    if (data.value) {
      comments.value = [data.value, ...comments.value];
      lastPostedComment.value = newComment.value.trim();
      newComment.value = '';
      activeTab.value = 'write';  // Reset to write tab after posting
    }
  } catch (err) {
    errorMessage.value = t('comment_post_error');
    console.error('Error posting comment:', err);
  } finally {
    isSubmitting.value = false;
  }
}

function loginToComment() {
  login(route.fullPath);
}

// Lifecycle
onMounted(() => {
  fetchComments();
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

.video-container {
  position: relative;
  width: 100%;
  max-width: 560px;
  margin: 1em auto;
}

.image-container {
  margin: 1em 0;
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
</style>
