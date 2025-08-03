/**
 * Emoji composable for handling emoji replacement in text content
 * 
 * Supports replacing :emojiname: syntax with actual emoji images
 * from the dynamically generated emoji manifest.
 */

interface EmojiData {
    name: string;
    filename: string;
    url: string;
    type: 'png' | 'gif';
    animated: boolean;
}

type EmojiManifest = Record<string, EmojiData>;

export const useEmoji = () => {
    const emojiManifest = ref<EmojiManifest | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    /**
     * Load the emoji manifest from the public directory
     */
    const loadEmojiManifest = async (): Promise<void> => {
        if (emojiManifest.value) {
            return; // Already loaded
        }

        isLoading.value = true;
        error.value = null;

        try {
            const response = await $fetch<EmojiManifest>('/emoji.json');
            emojiManifest.value = response;
        } catch (err) {
            error.value = 'Failed to load emoji manifest';
            console.warn('Could not load emoji manifest:', err);
            emojiManifest.value = {}; // Fallback to empty manifest
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Get emoji data by name
     */
    const getEmoji = (name: string): EmojiData | null => {
        if (!emojiManifest.value) {
            return null;
        }
        return emojiManifest.value[name.toLowerCase()] || null;
    };

    /**
     * Replace emoji syntax (:emojiname:) with HTML img tags
     */
    const replaceEmojis = (text: string): string => {
        if (!emojiManifest.value || !text) {
            return text;
        }

        // Find all :emojiname: patterns in the text
        return text.replace(/:([a-zA-Z0-9_-]+):/g, (match, emojiName) => {
            const emoji = getEmoji(emojiName);
            if (emoji) {
                const title = `Emoji: ${emoji.name}`;
                
                return `<img src="${emoji.url}" alt="${match}" title="${title}" class="emoji-inline" loading="lazy" />`;
            }
            return match; // Return original text if emoji not found
        });
    };

    /**
     * Get all available emoji names for autocomplete or picker UI
     */
    const getAvailableEmojis = (): string[] => {
        if (!emojiManifest.value) {
            return [];
        }
        return Object.keys(emojiManifest.value).sort();
    };

    /**
     * Get emojis filtered by type (animated vs static)
     */
    const getEmojisByType = (animated?: boolean): EmojiData[] => {
        if (!emojiManifest.value) {
            return [];
        }
        
        const emojis = Object.values(emojiManifest.value);
        if (animated === undefined) {
            return emojis;
        }
        
        return emojis.filter(emoji => emoji.animated === animated);
    };

    /**
     * Check if a specific emoji exists
     */
    const hasEmoji = (name: string): boolean => {
        return getEmoji(name) !== null;
    };

    /**
     * Process text content by replacing emojis (for use in text processing pipelines)
     */
    const processText = async (text: string): Promise<string> => {
        await loadEmojiManifest();
        return replaceEmojis(text);
    };

    // Auto-load manifest when composable is first used
    onMounted(() => {
        loadEmojiManifest();
    });

    return {
        // State
        emojiManifest: readonly(emojiManifest),
        emojis: computed(() => emojiManifest.value || {}),
        isLoading: readonly(isLoading),
        error: readonly(error),

        // Methods
        loadEmojiManifest,
        getEmoji,
        replaceEmojis,
        getAvailableEmojis,
        getEmojisByType,
        hasEmoji,
        processText,
    };
};
