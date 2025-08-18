<template>
    <div class="markdown-content prose prose-sm dark:prose-invert max-w-none" v-html="renderedComment"></div>
</template>

<script setup lang="ts">
import DOMPurify from 'isomorphic-dompurify';
import MarkdownIt from 'markdown-it';

// Props
const props = defineProps({
    comment: {
        type: String,
        required: true
    }
});

// Ensure comment is always a string
const safeComment = computed(() => {
    return typeof props.comment === 'string' ? props.comment : String(props.comment || '');
});

// Client-side rendered markdown content
const renderedComment = ref('');

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

// Enhanced markdown renderer with media support
const renderCommentMarkdown = (content: string): string => {
    if (!content || typeof content !== 'string') return '';

    try {
        const md = new MarkdownIt({
            html: true,
            xhtmlOut: false,
            breaks: true,
            langPrefix: 'language-',
            linkify: true,
            typographer: true,
        });

        // Pre-process content to replace media URLs with HTML directly
        let processedContent = content;

        // Find URLs and replace media URLs with their HTML embeds
        const urlRegex = /https?:\/\/[^\s<>'"]+/g;

        processedContent = processedContent.replace(urlRegex, (url) => {
            const cleanUrl = url.trim();
            const mediaType = detectMediaType(cleanUrl);

            if (mediaType !== 'link') {
                switch (mediaType) {
                    case 'youtube': {
                        const videoId = extractYouTubeId(cleanUrl);
                        if (videoId) {
                            return `<div class="youtube-container"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
                        }
                        break;
                    }
                    case 'giphy': {
                        const gifUrl = convertGiphyUrl(cleanUrl);
                        return `<img src="${gifUrl}" alt="Giphy GIF" style="max-width: 100%; height: auto;" />`;
                    }
                    case 'tenor': {
                        const gifUrl = convertTenorUrl(cleanUrl);
                        return `<img src="${gifUrl}" alt="Tenor GIF" style="max-width: 100%; height: auto;" />`;
                    }
                    case 'image': {
                        return `<img src="${cleanUrl}" alt="Image" style="max-width: 100%; height: auto;" />`;
                    }
                    case 'video': {
                        return `<video controls style="max-width: 100%; height: auto;"><source src="${cleanUrl}" /></video>`;
                    }
                }
            }

            // Return original URL for non-media links (they'll be processed by markdown-it)
            return url;
        });

        // Custom link renderer for remaining links
        const defaultLinkRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
            return self.renderToken(tokens, idx, options);
        };

        md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
            const token = tokens[idx];
            if (!token || !token.attrs) {
                return defaultLinkRender(tokens, idx, options, env, self);
            }

            const hrefIndex = token.attrIndex('href');
            if (hrefIndex >= 0 && token.attrs[hrefIndex]) {
                const href = token.attrs[hrefIndex][1];

                // Ensure href is a string
                if (typeof href === 'string' && href.trim()) {
                    // External links
                    if (href.startsWith('http://') || href.startsWith('https://')) {
                        token.attrPush(['target', '_blank']);
                        token.attrPush(['rel', 'noopener noreferrer']);
                    }
                }
            }

            return defaultLinkRender(tokens, idx, options, env, self);
        };

        const rawHTML = md.render(processedContent);

        // Sanitize HTML with media support
        return DOMPurify.sanitize(rawHTML, {
            ADD_TAGS: ['iframe', 'video', 'source', 'div'],
            ADD_ATTR: [
                'src', 'frameborder', 'allowfullscreen', 'controls', 'style',
                'alt', 'target', 'rel', 'href', 'class'
            ],
            FORBID_TAGS: ['script', 'style', 'form', 'input', 'button', 'textarea', 'select', 'option'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'eval']
        });

    } catch (error) {
        console.error('Error rendering comment markdown:', error);
        // Fallback to sanitized plain text
        return DOMPurify.sanitize(content);
    }
};

// Render markdown on client-side only to avoid SSR issues
onMounted(() => {
    const updateRenderedContent = () => {
        if (!safeComment.value) {
            renderedComment.value = '';
            return;
        }

        try {
            renderedComment.value = renderCommentMarkdown(safeComment.value);
        } catch (error) {
            console.error('Error rendering comment markdown:', error);
            // Fallback to sanitized plain text
            renderedComment.value = DOMPurify.sanitize(safeComment.value);
        }
    };

    // Initial render
    updateRenderedContent();

    // Watch for comment changes
    watch(safeComment, updateRenderedContent, { immediate: false });
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
