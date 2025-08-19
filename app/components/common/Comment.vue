<template>
    <div ref="commentContainer" class="markdown-content prose prose-sm dark:prose-invert max-w-none"
        v-html="renderedComment"></div>
</template>

<script setup lang="ts">
// Props
const props = defineProps({
    comment: {
        type: String,
        required: true
    }
});

// Template refs
const commentContainer = ref<HTMLElement>();

// Use composables
const { renderMarkdown } = useEnhancedMarkdown();
const { observeGifs, stopObserving } = useGifPause();

// Ensure comment is always a string
const safeComment = computed(() => {
    return typeof props.comment === 'string' ? props.comment : String(props.comment || '');
});

// Enhanced media detection functions
const detectMediaType = (url: string): 'image' | 'video' | 'youtube' | 'giphy' | 'tenor' | 'link' => {
    if (!url || typeof url !== 'string') return 'link';

    const lowerUrl = url.toLowerCase();

    // YouTube detection
    if (lowerUrl.includes('youtube.com/watch') || lowerUrl.includes('youtu.be/')) {
        return 'youtube';
    }

    // Giphy detection
    if (lowerUrl.includes('giphy.com') || lowerUrl.includes('gph.is')) {
        return 'giphy';
    }

    // Tenor detection
    if (lowerUrl.includes('tenor.com')) {
        return 'tenor';
    }

    // Video file extensions
    if (lowerUrl.match(/\.(mp4|webm|ogg|avi|mov)$/)) {
        return 'video';
    }

    // Image file extensions
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
        return 'image';
    }

    return 'link';
};

const extractYouTubeId = (url: string): string | null => {
    if (!url || typeof url !== 'string') return null;

    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match?.[1] ?? null;
};

const convertGiphyUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return url;

    // Convert various Giphy URLs to embed format
    if (url.includes('giphy.com/gifs/') || url.includes('gph.is/')) {
        const gifId = url.split('/').pop()?.split('-').pop();
        if (gifId) {
            return `https://i.giphy.com/media/${gifId}/giphy.gif`;
        }
    }

    // Handle direct Giphy media URLs
    if (url.includes('media.giphy.com') || url.includes('i.giphy.com')) {
        return url;
    }

    return url;
};

const convertTenorUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return url;

    // Convert Tenor URLs to direct GIF URLs
    const match = url.match(/tenor\.com\/view\/[^-]*-(\d+)/);
    if (match) {
        const gifId = match[1];
        return `https://media.tenor.com/${gifId}/tenor.gif`;
    }

    // Handle direct Tenor media URLs
    if (url.includes('media.tenor.com')) {
        return url;
    }

    return url;
};

// Process images in HTML to handle special URL formats
const processImages = (html: string): string => {
    if (!html) return html;

    try {
        // Create a temporary DOM to process images
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Find all img elements
        const images = tempDiv.querySelectorAll('img[src]');

        images.forEach((img) => {
            const src = img.getAttribute('src');
            if (!src) return;

            // Process Imgur URLs
            if (src.includes('imgur.com')) {
                const processedSrc = processImgurUrl(src);
                img.setAttribute('src', processedSrc);
            }
            // Process Giphy URLs
            else if (src.includes('giphy.com')) {
                const processedSrc = convertGiphyUrl(src);
                img.setAttribute('src', processedSrc);
            }
            // Process Tenor URLs
            else if (src.includes('tenor.com')) {
                const processedSrc = convertTenorUrl(src);
                img.setAttribute('src', processedSrc);
            }

            // Add responsive styling
            img.setAttribute('style', 'max-width: 100%; height: auto;');
            img.setAttribute('loading', 'lazy');
        });

        return tempDiv.innerHTML;
    } catch (error) {
        console.error('Error processing images:', error);
        return html;
    }
};

// Process Imgur URLs to direct image URLs
const processImgurUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return url;

    // Direct image URLs are fine as-is
    if (url.includes('i.imgur.com') && /\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
        return url;
    }

    // Convert gallery/post URLs to direct image URLs
    const match = url.match(/imgur\.com\/([a-zA-Z0-9]+)/);
    if (match) {
        const hash = match[1];
        return `https://i.imgur.com/${hash}.jpg`;
    }

    return url;
};

// Simple and safe markdown renderer using enhanced markdown composable
const renderCommentMarkdown = async (content: string): Promise<string> => {
    if (!content || typeof content !== 'string') return '';

    try {
        // Use the enhanced markdown composable for basic markdown
        let processedHTML = await renderMarkdown(content, {
            allowHtml: false
        });

        // Process images in the HTML to handle special URLs (Imgur, etc.)
        processedHTML = processImages(processedHTML);

        // Then post-process to replace link elements that contain media URLs with HTML embeds
        const linkRegex = /<a href="([^"]+)">([^<]+)<\/a>/g;

        processedHTML = processedHTML.replace(linkRegex, (match: string, href: string, linkText: string) => {
            // Check if the href or linkText is a media URL
            const urlToCheck = href || linkText;
            const mediaType = detectMediaType(urlToCheck);

            if (mediaType !== 'link') {
                switch (mediaType) {
                    case 'youtube': {
                        const videoId = extractYouTubeId(urlToCheck);
                        if (videoId) {
                            return `<div class="youtube-container"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
                        }
                        break;
                    }
                    case 'giphy': {
                        const gifUrl = convertGiphyUrl(urlToCheck);
                        return `<img src="${gifUrl}" alt="Giphy GIF" style="max-width: 100%; height: auto;" />`;
                    }
                    case 'tenor': {
                        const gifUrl = convertTenorUrl(urlToCheck);
                        return `<img src="${gifUrl}" alt="Tenor GIF" style="max-width: 100%; height: auto;" />`;
                    }
                    case 'image': {
                        return `<img src="${urlToCheck}" alt="Image" style="max-width: 100%; height: auto;" />`;
                    }
                    case 'video': {
                        return `<video controls style="max-width: 100%; height: auto;"><source src="${urlToCheck}" /></video>`;
                    }
                }
            }

            // Return original link for non-media URLs
            return match;
        });

        return processedHTML;

        return processedHTML;

    } catch (error) {
        console.error('Error rendering comment markdown:', error);
        // Fallback to escaped plain text
        return content.replace(/[&<>"']/g, (match) => {
            const escapes: Record<string, string> = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;'
            };
            return escapes[match] || match;
        }).replace(/\n/g, '<br>');
    }
};

// Server and client rendered markdown content
// Reactive rendered comment
const renderedComment = ref('');

// Watch for changes to safeComment and re-render
watch(safeComment, async (newComment) => {
    if (!newComment) {
        renderedComment.value = '';
        return;
    }

    try {
        renderedComment.value = await renderCommentMarkdown(newComment);
    } catch (error) {
        console.error('Error rendering comment markdown:', error);
        // Fallback to escaped plain text
        renderedComment.value = newComment.replace(/[&<>"']/g, (match) => {
            const escapes: Record<string, string> = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;'
            };
            return escapes[match] || match;
        }).replace(/\n/g, '<br>');
    }
}, { immediate: true });

// Watch for content changes and re-observe GIFs
watch(renderedComment, async () => {
    if (!commentContainer.value) return;

    // Wait for DOM update
    await nextTick();

    // Stop observing old GIFs
    stopObserving(commentContainer.value);

    // Start observing new GIFs
    observeGifs(commentContainer.value);
});

// Initialize GIF observation on mount
onMounted(async () => {
    if (!commentContainer.value) return;

    // Wait for DOM to be fully rendered
    await nextTick();

    // Start observing GIFs
    observeGifs(commentContainer.value);
});
</script>

<style scoped>
.markdown-content {
    word-wrap: break-word;
    overflow-wrap: break-word;
}

.markdown-content :deep(img) {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0.5rem 0;
}

.markdown-content :deep(video) {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0.5rem 0;
}

.markdown-content :deep(iframe) {
    max-width: 100%;
    margin: 0.5rem 0;
}

.markdown-content :deep(.youtube-container) {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
    margin: 0.5rem 0;
}

.markdown-content :deep(.youtube-container iframe) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
</style>
