<template>
    <div class="comment-input">
        <!-- Header with character count and tabs -->
        <div class="flex items-center justify-between mb-3">
            <!-- Tab switcher in the top right -->
            <div class="ml-auto">
                <div class="flex border border-light-dark-border rounded-md overflow-hidden">
                    <button @click="activeTab = 'write'" class="px-3 py-1 text-xs tab-button"
                        :class="activeTab === 'write' ? 'tab-active' : 'tab-inactive'">
                        {{ $t('write') }}
                    </button>
                    <button @click="activeTab = 'preview'" class="px-3 py-1 text-xs tab-button"
                        :class="activeTab === 'preview' ? 'tab-active' : 'tab-inactive'">
                        {{ $t('preview') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Editor container -->
        <div class="w-full">
            <!-- Write tab -->
            <div v-show="activeTab === 'write'" class="editor-container">
                <UTextarea :value="modelValue" :rows="6" ref="textareaRef"
                    class="w-full mb-2 font-mono bg-light-dark-input border-light-dark-border" :disabled="disabled"
                    :placeholder="placeholder" @input="handleInput" @keydown="handleKeyDown" />

                <!-- Emoji autocomplete dropdown -->
                <div v-if="showEmojiAutocomplete && autocompleteEmojis.length > 0" ref="emojiAutocompleteRef"
                    class="emoji-autocomplete-dropdown fixed z-[9999] bg-white dark:bg-gray-800 border border-light-dark-border rounded-lg shadow-lg py-1 min-w-48"
                    :style="{ left: emojiAutocompletePosition.left + 'px', top: emojiAutocompletePosition.top + 'px' }">
                    <div v-for="(suggestion, index) in autocompleteEmojis" :key="suggestion.name"
                        @click="selectAutocompleteEmoji(suggestion.name)"
                        class="emoji-autocomplete-item flex items-center px-3 py-2 cursor-pointer hover:bg-light-dark-hover"
                        :class="{ 'bg-primary-100 dark:bg-primary-900': index === selectedAutocompleteIndex }">
                        <img :src="suggestion.emoji.url" :alt="suggestion.name" class="w-5 h-5 mr-2 flex-shrink-0">
                        <span class="text-sm"
                            v-html="':' + highlightMatch(suggestion.name, emojiAutocompleteQuery) + ':'"></span>
                    </div>
                </div>

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
                    <!-- Emoji picker button -->
                    <div ref="emojiButtonRef">
                        <UButton size="xs" @click="toggleEmojiPicker" color="neutral">
                            <Icon name="lucide:smile" class="w-4 h-4 mr-1" />
                            {{ $t('emoji') }}
                        </UButton>
                    </div>
                </div>

                <!-- Emoji picker dropdown -->
                <div v-if="showEmojiPicker" ref="emojiPickerRef"
                    class="emoji-picker-dropdown absolute z-[9999] bg-white dark:bg-gray-800 border border-light-dark-border rounded-lg shadow-lg p-4 max-h-64 overflow-y-auto"
                    :style="emojiPickerStyle">
                    <div class="mb-2">
                        <input v-model="emojiSearch" type="text" :placeholder="$t('search_emoji')"
                            class="w-full px-2 py-1 text-sm border border-light-dark-border rounded bg-light-dark-input">
                    </div>
                    <div class="emoji-grid grid grid-cols-8 gap-1">
                        <button v-for="(emoji, name) in filteredEmojis" :key="name" @click="insertEmoji(name)"
                            class="emoji-button p-1 rounded hover:bg-light-dark-hover transition-colors"
                            :title="`:${name}:`">
                            <img :src="emoji.url" :alt="name" class="emoji-image w-6 h-6">
                        </button>
                    </div>
                    <div v-if="Object.keys(filteredEmojis).length === 0"
                        class="text-center text-sm text-light-dark-secondary py-4">
                        {{ $t('no_emojis_found') }}
                    </div>
                </div>
            </div>

            <!-- Preview tab -->
            <div v-show="activeTab === 'preview'"
                class="preview-container border rounded-md p-3 mb-3 prose prose-sm dark:prose-invert bg-light-dark-input">
                <ClientOnly>
                    <Comment v-if="modelValue.trim()" :comment="modelValue" />
                    <div v-else class="text-light-dark-secondary text-sm italic">{{ $t('preview_empty') }}</div>
                </ClientOnly>
            </div>
        </div>

        <div class="flex justify-between mt-3">
            <p class="text-xs text-light-dark-secondary" :class="{ 'text-red-500': charactersRemaining < 0 }">
                {{ charactersRemaining }} {{ $t('charactersRemaining') }}
            </p>
            <UButton :loading="loading" :disabled="submitDisabled" @click="$emit('submit')" color="primary" size="sm">
                {{ submitButtonText }}
            </UButton>
        </div>

        <!-- URL Input Modal -->
        <Modal :is-open="showUrlModal" :title="urlModalTitle" @close="closeUrlModal" size="lg">
            <div class="space-y-4">
                <div>
                    <label for="url-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {{ $t('markdown_editor.url_label') }}
                    </label>
                    <input id="url-input" v-model="urlInput" type="url" :placeholder="urlPlaceholder"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        @keydown.enter="insertUrl" />
                </div>

                <!-- URL Preview -->
                <div v-if="urlPreview"
                    class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('preview') }}</h4>

                    <!-- Image preview -->
                    <div v-if="urlType === 'image' || urlType === 'youtube'" class="relative">
                        <img :src="urlPreview" :alt="urlType + ' preview'"
                            class="max-w-full max-h-48 rounded object-contain mx-auto" @error="urlPreview = null" />
                    </div>

                    <!-- Other URL preview -->
                    <div v-else class="text-sm text-gray-600 dark:text-gray-400">
                        <Icon :name="getUrlIcon(urlType)" class="w-4 h-4 inline mr-1" />
                        {{ urlInput }}
                    </div>
                </div>
            </div>

            <template #footer>
                <UButton color="neutral" @click="closeUrlModal">
                    {{ $t('cancel') }}
                </UButton>
                <UButton color="primary" @click="insertUrl" :disabled="!urlInput.trim()">
                    {{ $t('insert') }}
                </UButton>
            </template>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';

// Props
const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    disabled: {
        type: Boolean,
        default: false
    },
    loading: {
        type: Boolean,
        default: false
    },
    placeholder: {
        type: String,
        default: 'Enter your comment...'
    },
    maxLength: {
        type: Number,
        default: 1000
    },
    submitButtonText: {
        type: String,
        default: 'Post Comment'
    },
    lastPostedComment: {
        type: String,
        default: ''
    }
});

// Emits
const emit = defineEmits(['update:modelValue', 'submit', 'input']);

// Composables
const { t } = useI18n();
const { emojis } = useEmoji();

// Reactive data
const activeTab = ref<'write' | 'preview'>('write');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const showEmojiPicker = ref(false);
const emojiSearch = ref('');
const emojiButtonRef = ref<HTMLElement | null>(null);
const emojiPickerRef = ref<HTMLElement | null>(null);
const emojiPickerStyle = ref<Record<string, string>>({});
const savedCursorPosition = ref<{ start: number; end: number } | null>(null);

// Emoji autocomplete
const showEmojiAutocomplete = ref(false);
const emojiAutocompleteQuery = ref('');
const emojiAutocompletePosition = ref({ top: 0, left: 0 });
const emojiAutocompleteRef = ref<HTMLElement | null>(null);
const selectedAutocompleteIndex = ref(0);
const currentEmojiMatch = ref<{ start: number; end: number; query: string } | null>(null);

// URL Input Modal
const showUrlModal = ref(false);
const urlInput = ref('');
const urlType = ref<'image' | 'youtube' | 'imgur' | 'giphy' | 'tenor'>('image');
const urlPreview = ref<string | null>(null);

// Computed
const charactersRemaining = computed(() => props.maxLength - props.modelValue.length);

const submitDisabled = computed(() => {
    return (
        props.loading ||
        props.modelValue.trim() === "" ||
        charactersRemaining.value < 0 ||
        props.modelValue.trim() === props.lastPostedComment
    );
});

const filteredEmojis = computed(() => {
    if (!emojiSearch.value) return emojis.value;

    const search = emojiSearch.value.toLowerCase();
    return Object.fromEntries(
        Object.entries(emojis.value).filter(([name]) =>
            name.toLowerCase().includes(search)
        )
    );
});

const autocompleteEmojis = computed(() => {
    if (!emojiAutocompleteQuery.value) return [];

    const query = emojiAutocompleteQuery.value.toLowerCase();
    return Object.entries(emojis.value)
        .filter(([name]) => name.toLowerCase().includes(query))
        .slice(0, 5) // Limit to 5 suggestions
        .map(([name, emoji]) => ({ name, emoji }));
});

const urlModalTitle = computed(() => {
    const titles = {
        image: t('markdown_editor.add_image'),
        youtube: t('markdown_editor.add_youtube'),
        imgur: t('markdown_editor.add_imgur'),
        giphy: t('markdown_editor.add_giphy'),
        tenor: t('markdown_editor.add_tenor')
    };
    return titles[urlType.value];
});

const urlPlaceholder = computed(() => {
    const placeholders = {
        image: 'https://example.com/image.jpg',
        youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        imgur: 'https://imgur.com/a/example',
        giphy: 'https://giphy.com/gifs/example',
        tenor: 'https://tenor.com/view/example'
    };
    return placeholders[urlType.value];
});

// Close emoji picker when clicking outside
onClickOutside(emojiPickerRef, () => {
    showEmojiPicker.value = false;
}, {
    ignore: [emojiButtonRef]
});

// Close autocomplete when clicking outside
onClickOutside(emojiAutocompleteRef, () => {
    showEmojiAutocomplete.value = false;
});

// Watch for URL input changes to generate preview
watch(urlInput, (newUrl) => {
    if (!newUrl.trim()) {
        urlPreview.value = null;
        return;
    }

    // Generate preview based on URL type
    switch (urlType.value) {
        case 'image':
            urlPreview.value = newUrl;
            break;
        case 'youtube':
            urlPreview.value = generateYouTubePreview(newUrl);
            break;
        case 'imgur':
        case 'giphy':
        case 'tenor':
            urlPreview.value = newUrl;
            break;
        default:
            urlPreview.value = null;
    }
});

// Methods
function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    const newValue = target.value;
    emit('update:modelValue', newValue);
    emit('input', event);

    // Check for emoji autocomplete
    checkEmojiAutocomplete(target);
}

function checkEmojiAutocomplete(textarea: HTMLTextAreaElement) {
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;

    // Look for : followed by characters before cursor
    const beforeCursor = text.substring(0, cursorPos);
    const emojiMatch = beforeCursor.match(/:([a-zA-Z0-9_]*)$/);

    if (emojiMatch && emojiMatch[1] && emojiMatch[1].length > 0) {
        // Found a potential emoji query
        const query = emojiMatch[1];
        const startPos = cursorPos - emojiMatch[0].length;

        currentEmojiMatch.value = {
            start: startPos,
            end: cursorPos,
            query: query
        };

        emojiAutocompleteQuery.value = query;
        selectedAutocompleteIndex.value = 0;

        // Position the autocomplete dropdown
        positionEmojiAutocomplete(textarea, cursorPos);
        showEmojiAutocomplete.value = true;
    } else {
        // Hide autocomplete if no match
        showEmojiAutocomplete.value = false;
        currentEmojiMatch.value = null;
    }
}

function positionEmojiAutocomplete(textarea: HTMLTextAreaElement, cursorPos: number) {
    // Create a temporary element to measure text dimensions
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.style.whiteSpace = 'pre-wrap';

    // Batch all computed style queries to avoid forced reflows
    const computedStyle = window.getComputedStyle(textarea);
    temp.style.font = computedStyle.font;
    temp.style.padding = computedStyle.padding;
    temp.style.border = computedStyle.border;
    temp.style.width = textarea.offsetWidth + 'px';

    // Get text up to cursor position
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    temp.textContent = textBeforeCursor;

    document.body.appendChild(temp);

    // Get textarea position
    const textareaRect = textarea.getBoundingClientRect();

    // Calculate cursor position
    const tempRect = temp.getBoundingClientRect();
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;

    // Position relative to textarea
    const left = textareaRect.left + (tempRect.width % textarea.offsetWidth);
    const top = textareaRect.top + tempRect.height + lineHeight;

    document.body.removeChild(temp);

    emojiAutocompletePosition.value = {
        left: left,
        top: top
    };
}

function selectAutocompleteEmoji(emojiName: string) {
    if (!currentEmojiMatch.value) return;

    const textarea = textareaRef.value;
    if (!textarea) return;

    const { start, end } = currentEmojiMatch.value;
    const currentValue = props.modelValue || '';
    const newValue = currentValue.substring(0, start) + `:${emojiName}:` + currentValue.substring(end);

    emit('update:modelValue', newValue);

    // Hide autocomplete
    showEmojiAutocomplete.value = false;
    currentEmojiMatch.value = null;

    nextTick(() => {
        textarea.focus();
        const newCursorPos = start + `:${emojiName}:`.length;
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    });
}

function handleKeyDown(event: KeyboardEvent) {
    if (!showEmojiAutocomplete.value) return;

    const suggestions = autocompleteEmojis.value;
    if (suggestions.length === 0) return;

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            selectedAutocompleteIndex.value = (selectedAutocompleteIndex.value + 1) % suggestions.length;
            break;
        case 'ArrowUp':
            event.preventDefault();
            selectedAutocompleteIndex.value = selectedAutocompleteIndex.value === 0
                ? suggestions.length - 1
                : selectedAutocompleteIndex.value - 1;
            break;
        case 'Enter':
        case 'Tab':
            event.preventDefault();
            const selectedEmoji = suggestions[selectedAutocompleteIndex.value];
            if (selectedEmoji) {
                selectAutocompleteEmoji(selectedEmoji.name);
            }
            break;
        case 'Escape':
            event.preventDefault();
            showEmojiAutocomplete.value = false;
            currentEmojiMatch.value = null;
            break;
    }
}

function highlightMatch(text: string, query: string) {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
}

function generateYouTubePreview(url: string): string {
    // Extract video ID from various YouTube URL formats
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (videoIdMatch) {
        return `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
    }
    return url;
}

function openUrlModal(type: 'image' | 'youtube' | 'imgur' | 'giphy' | 'tenor') {
    urlType.value = type;
    urlInput.value = '';
    urlPreview.value = null;
    showUrlModal.value = true;
}

function closeUrlModal() {
    showUrlModal.value = false;
    urlInput.value = '';
    urlPreview.value = null;
}

function insertUrl() {
    if (!urlInput.value.trim()) return;

    let insertText = urlInput.value.trim();

    // For images, wrap in markdown syntax
    if (urlType.value === 'image') {
        insertText = `![Image](${insertText})`;
    }

    insertTextAtCursor(insertText);
    closeUrlModal();
}

function getUrlIcon(type: string): string {
    const icons = {
        image: 'lucide:image',
        youtube: 'lucide:video',
        imgur: 'simple-icons:imgur',
        giphy: 'simple-icons:giphy',
        tenor: 'simple-icons:tenor'
    };
    return icons[type as keyof typeof icons] || 'lucide:link';
}

function toggleEmojiPicker() {
    showEmojiPicker.value = !showEmojiPicker.value;

    if (showEmojiPicker.value) {
        nextTick(() => {
            positionEmojiPicker();
        });
    }
}

function positionEmojiPicker() {
    if (!emojiButtonRef.value || !emojiPickerRef.value) return;

    const buttonRect = emojiButtonRef.value.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const pickerWidth = 320; // Approximate width of emoji picker
    const pickerHeight = 260; // Approximate height of emoji picker

    let left = buttonRect.left;
    let top = buttonRect.top - pickerHeight - 8; // Default to showing above the button

    // Adjust if picker would go off-screen horizontally
    if (left + pickerWidth > viewportWidth) {
        left = viewportWidth - pickerWidth - 16;
    }

    // If there's not enough space above, show below instead
    if (top < 16) {
        top = buttonRect.bottom + 8;
    }

    // If still not enough space below, position at top of viewport
    if (top + pickerHeight > viewportHeight) {
        top = 16;
    }

    emojiPickerStyle.value = {
        left: `${left}px`,
        top: `${top}px`,
        position: 'fixed'
    };
}

function insertEmoji(emojiName: string) {
    const emojiText = `:${emojiName}:`;
    insertTextAtCursor(emojiText);
    showEmojiPicker.value = false;
}

function insertMarkdown(prefix: string, suffix: string) {
    const textarea = textareaRef.value;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = props.modelValue.substring(start, end);

    const newValue =
        props.modelValue.substring(0, start) +
        prefix +
        selection +
        suffix +
        props.modelValue.substring(end);

    emit('update:modelValue', newValue);

    // Set cursor position to right after the inserted text
    nextTick(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + prefix.length + selection.length;
    });
}

function insertImage() {
    openUrlModal('image');
}

function insertYoutube() {
    openUrlModal('youtube');
}

function insertImgur() {
    openUrlModal('imgur');
}

function insertGiphy() {
    openUrlModal('giphy');
}

function insertTenor() {
    openUrlModal('tenor');
}

function insertTextAtCursor(text: string) {
    const textarea = textareaRef.value;
    if (!textarea) return;

    // Use saved cursor position if available, otherwise default to end of text
    let start: number, end: number;
    if (savedCursorPosition.value) {
        start = savedCursorPosition.value.start;
        end = savedCursorPosition.value.end;
        savedCursorPosition.value = null; // Clear after use
    } else {
        // If no saved position, check current cursor position
        start = textarea.selectionStart || props.modelValue.length;
        end = textarea.selectionEnd || props.modelValue.length;

        // If cursor is at position 0 (likely lost focus), insert at end
        if (start === 0 && end === 0 && props.modelValue.length > 0) {
            start = end = props.modelValue.length;
        }
    }

    // Use props.modelValue as the source of truth
    const currentValue = props.modelValue || '';
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);

    emit('update:modelValue', newValue);

    nextTick(() => {
        textarea.focus();
        // Set cursor position to after the inserted text
        const newCursorPosition = start + text.length;
        textarea.selectionStart = textarea.selectionEnd = newCursorPosition;
    });
}

// Handle window resize to reposition emoji picker
onMounted(() => {
    window.addEventListener('resize', () => {
        if (showEmojiPicker.value) {
            positionEmojiPicker();
        }
    });
});
</script>

<style scoped>
.emoji-picker-dropdown {
    width: 320px;
    max-width: 90vw;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    backdrop-filter: blur(8px);
    z-index: 9999 !important;
}

.emoji-button:hover {
    transform: scale(1.1);
}

.emoji-image {
    display: block;
    object-fit: contain;
}

.editor-container {
    position: relative;
}

/* Ensure the emoji picker appears above everything */
:global(.emoji-picker-dropdown) {
    z-index: 9999 !important;
    position: fixed !important;
}

.emoji-autocomplete-dropdown {
    max-height: 200px;
    overflow-y: auto;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.emoji-autocomplete-item {
    transition: background-color 0.15s ease-in-out;
}

.emoji-autocomplete-item:hover {
    background-color: rgba(0, 0, 0, 0.05);
}

:global(.dark) .emoji-autocomplete-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

/* Tab button styles */
.tab-button {
    transition: all 0.15s ease-in-out;
    border: none;
    cursor: pointer;
}

.tab-active {
    background-color: var(--color-brand-primary);
    color: white;
}

.tab-active:hover {
    background-color: var(--color-brand-primary-hover);
}

.tab-inactive {
    background-color: var(--color-bg-secondary);
    color: var(--color-text-secondary);
}

.tab-inactive:hover {
    background-color: var(--color-bg-primary);
    color: var(--color-text-primary);
}
</style>
