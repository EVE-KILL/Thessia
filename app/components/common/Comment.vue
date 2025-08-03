<template>
    <div class="markdown-content prose prose-sm dark:prose-invert max-w-none" v-html="renderMarkdown(comment)">
    </div>
</template>

<script setup lang="ts">
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import { nextTick, ref } from 'vue';

// Composables
const { replaceEmojis, loadEmojiManifest } = useEmoji();

// Props
const props = defineProps({
    comment: {
        type: String,
        required: true
    }
});

// Load emoji manifest when component mounts
onMounted(() => {
    loadEmojiManifest();
});

// Markdown rendering - exact copy from KillComments
type MediaType = "image" | "video" | "gif" | "iframe" | "unknown";

/**
 * Add autolink extension to handle raw URLs in text
 */
marked.use({
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

/**
 * Extract URL from token based on marked version compatibility
 * @param token - Link token from marked parser
 * @returns Safe URL string
 */
function extractUrl(token: any): string {
    if (!token) return "";

    // Handle different marked versions and token structures
    if (typeof token === "string") return token;
    if (token.raw) return token.raw;
    if (token.href) return token.href;
    return "";
}

/**
 * Extract text from token based on marked version compatibility
 * @param token - Text token from marked parser
 * @returns Safe text string
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
 * @param url - URL to analyze
 * @returns Media type and additional metadata
 */
function detectMediaType(url: string): {
    type: MediaType;
    id?: string;
    matches?: RegExpMatchArray | null;
} {
    // YouTube (including shorts)
    const youtubeMatch =
        url.match(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/) ||
        url.match(/^https?:\/\/(www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/) ||
        url.match(/^https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) {
        return { type: "iframe", id: youtubeMatch[2], matches: youtubeMatch };
    }

    // Imgur direct
    const imgurDirectMatch = url.match(
        /^https?:\/\/(i\.)?imgur\.com\/([a-zA-Z0-9]+)(\.(jpeg|jpg|png|gif|mp4|webm))?$/i,
    );
    if (imgurDirectMatch) {
        const extension = imgurDirectMatch[3] || ".jpg";
        const mediaType = extension.match(/\.(mp4|webm)$/i) ? "video" : "image";
        return { type: mediaType as MediaType, id: imgurDirectMatch[2], matches: imgurDirectMatch };
    }

    // Imgur gallery
    const imgurGalleryMatch = url.match(/^https?:\/\/(www\.)?imgur\.com\/(gallery|a)\/([^\/\s]+)/i);
    if (imgurGalleryMatch) {
        return { type: "iframe", id: imgurGalleryMatch[3], matches: imgurGalleryMatch };
    }

    // Giphy complex URL
    const complexGiphyMatch = url.match(
        /^https?:\/\/media[0-9]?\.giphy\.com\/media\/v[0-9]\..*?\/.*?\/giphy\.gif/,
    );
    if (complexGiphyMatch) {
        return { type: "image", matches: complexGiphyMatch };
    }

    // Giphy simple URL
    const simpleGiphyMatch =
        !complexGiphyMatch &&
        (url.match(/^https?:\/\/(www\.)?giphy\.com\/gifs\/([a-zA-Z0-9]+-)*([a-zA-Z0-9]+)/) ||
            url.match(/^https?:\/\/media[0-9]?\.giphy\.com\/media\/([a-zA-Z0-9]+)/));
    if (simpleGiphyMatch) {
        const giphyId = simpleGiphyMatch[simpleGiphyMatch.length - 1];
        return { type: "image", id: giphyId, matches: simpleGiphyMatch };
    }

    // Tenor
    const tenorMatch = url.match(/^https?:\/\/(www\.)?tenor\.com\/view\/[a-zA-Z0-9-]+-([0-9]+)/);
    if (tenorMatch) {
        return { type: "iframe", id: tenorMatch[2], matches: tenorMatch };
    }

    // Standard image
    const imageMatch = url.match(/\.(jpeg|jpg|gif|png)$/i);
    if (imageMatch) {
        return { type: "image", matches: imageMatch };
    }

    // Standard video
    const videoMatch = url.match(/\.(mp4|webm)$/i);
    if (videoMatch) {
        return { type: "video", matches: videoMatch };
    }

    // Default - regular link
    return { type: "unknown" };
}

// Create a reactive map to store resolved Imgur URLs with media type information
const resolvedImgurMedia = ref(new Map<string, { url: string; type: string }>());

// Function to resolve an Imgur gallery/album URL to its media
async function resolveImgurUrl(url: string): Promise<{ url: string; type: string } | null> {
    try {
        // Generate a unique cache key for this specific URL
        const cacheKey = url.trim();

        // Don't re-fetch URLs we've already resolved in this session
        if (resolvedImgurMedia.value.has(cacheKey)) {
            return resolvedImgurMedia.value.get(cacheKey) || null;
        }

        // Use server proxy to fetch Imgur data (avoids CORS issues)
        const data = await $fetch("/api/proxy/imgur", {
            method: "POST",
            body: { url: cacheKey },
            headers: {
                "Content-Type": "application/json",
            },
        }) as any;

        if (data?.mediaUrl) {
            const result = {
                url: data.mediaUrl,
                type: data.mediaType || "image",
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

/**
 * Generate HTML for YouTube embed
 */
function renderYouTube(videoId: string): string {
    return `<div class="video-container">
            <iframe width="100%" height="315"
              src="https://www.youtube.com/embed/${videoId}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>`;
}

/**
 * Generate HTML for Imgur direct media
 */
function renderImgurDirect(imgurId: string, extension: string, originalUrl: string): string {
    // Check if it's a video
    if (extension.match(/\.(mp4|webm)$/i)) {
        return `<div class="video-container">
              <video autoplay loop muted playsinline controls class="max-w-full">
                <source src="https://i.imgur.com/${imgurId}${extension}" type="video/mp4">
                Your browser doesn't support HTML5 video.
              </video>
              <div class="media-source">
                <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="source-link">
                  <span class="flex items-center"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16V5c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11 5v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1zm7 0v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1z"></path></svg>View on Imgur</span>
                </a>
              </div>
            </div>`;
    }
    return `<div class="image-container">
              <img src="https://i.imgur.com/${imgurId}${extension}" alt="Imgur Image" class="max-w-full h-auto" />
              <div class="media-source">
                <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="source-link">
                  <span class="flex items-center"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16V5c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h12c.1 0 2-.9 2-2zm-11 5v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1zm7 0v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1z"></path></svg>View on Imgur</span>
                </a>
              </div>
            </div>`;
}

/**
 * Generate HTML for Imgur gallery/album with async loading
 */
function renderImgurGallery(originalUrl: string): string {
    const uniqueId = `imgur-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

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
                    if (media.type === "video") {
                        placeholder.innerHTML = `<video autoplay loop muted playsinline controls class="max-w-full">
                                    <source src="${media.url}" type="video/mp4">
                                    Your browser doesn't support HTML5 video.
                                   </video>`;
                    } else if (media.type === "gif") {
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
              <span class="flex items-center"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16V5c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h12c.1 0 2-.9 2-2zm-11 5v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1zm7 0v-1h-4v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1z"></path></svg>View on Imgur</span>
            </a>
          </div>
        </div>`;
}

/**
 * Generate HTML for Giphy media
 */
function renderGiphy(url: string, giphyId?: string): string {
    const imgSrc = giphyId ? `https://media.giphy.com/media/${giphyId}/giphy.gif` : url;

    return `<div class="gif-container">
            <img src="${imgSrc}" alt="GIPHY" class="max-w-full h-auto" />
            <div class="media-source">
              <a href="${url}" target="_blank" rel="noopener noreferrer" class="source-link">
              </a>
            </div>
          </div>`;
}

/**
 * Generate HTML for Tenor embed
 */
function renderTenor(tenorId: string, url: string): string {
    return `<div class="gif-container">
            <iframe src="https://tenor.com/embed/${tenorId}" frameBorder="0" width="100%" height="300px"></iframe>
            <div class="media-source">
              <a href="${url}" target="_blank" rel="noopener noreferrer" class="source-link">
                <span class="flex items-center"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M19.975 8.484L5.717 2.677a.421.421 0 0 0-.58.557l2.879 6.172a.41.41 0 0 1 0 .338L5.16 15.982a.422.422 0 0 0 .58.558l14.257-5.807a.422.422 0 0 0 0-.783l-.022-.466z"></path></svg>View on Tenor</span>
              </a>
            </div>
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

// Create the custom renderer
const renderer = new marked.Renderer();

// Custom link renderer to handle both older and newer marked versions
renderer.link = ({ href, title, tokens }: any): string => {
    // Extract URL and text safely from potentially complex tokens
    const url = extractUrl(href);
    const linkText = extractText(tokens?.[0] || href);
    const linkTitle = title || "";

    // If URL is not valid, return a basic link or text
    if (!url) {
        return `<span>${linkText || "link"}</span>`;
    }

    // Detect media type and get appropriate renderer
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
            if (url.includes("imgur.com") && matches) {
                const imgurId = matches[2] || '';
                const extension = matches[3] || ".jpg";
                return renderImgurDirect(imgurId, extension, url);
            }
            if (url.includes("giphy.com") || url.includes("media.giphy.com")) {
                return renderGiphy(url, id);
            }
            return renderImage(url, linkText);
    }

    // Default: regular link
    return `<a href="${url}" title="${linkTitle}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
};

// Apply the custom renderer to marked
marked.use({ renderer });

const renderMarkdown = (text: string) => {
    if (!text) return "";

    try {
        // Convert markdown to HTML and sanitize
        const rawHTML = marked.parse(text) as string;
        
        // Process emojis in the HTML
        const htmlWithEmojis = replaceEmojis(rawHTML);
        
        return DOMPurify.sanitize(htmlWithEmojis, {
            ADD_TAGS: ["iframe", "blockquote", "video", "source", "img"],
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
                "alt",
                "title",
                "class",
                "loading",
            ],
            FORBID_TAGS: ["script", "style", "form", "input", "button", "textarea", "select", "option"],
            FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onmouseout", "eval"],
        });
    } catch (error) {
        console.error('Error rendering markdown:', error);
        return DOMPurify.sanitize(text || '');
    }
};
</script>

<style>
/* Note: Not scoped so that styles can apply to v-html content */
.markdown-content.prose {
    color: inherit;
    max-width: none;
}

.markdown-content.prose h1 {
    font-size: 1.875rem;
    font-weight: 800;
    line-height: 2.25rem;
    margin-bottom: 0.75rem;
    margin-top: 1.5rem;
}

.markdown-content.prose h2 {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 2rem;
    margin-bottom: 0.5rem;
    margin-top: 1.25rem;
}

.markdown-content.prose h3 {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.75rem;
    margin-bottom: 0.5rem;
    margin-top: 1rem;
}

.markdown-content.prose h4 {
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.5rem;
    margin-bottom: 0.25rem;
    margin-top: 0.75rem;
}

.markdown-content.prose h5,
.markdown-content.prose h6 {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.5rem;
    margin-bottom: 0.25rem;
    margin-top: 0.75rem;
}

.markdown-content.prose p {
    margin-bottom: 1rem;
    line-height: 1.75;
}

.markdown-content.prose strong {
    font-weight: 700;
}

.markdown-content.prose em {
    font-style: italic;
}

.markdown-content.prose blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    color: #6b7280;
}

.dark .markdown-content.prose blockquote {
    border-left-color: #374151;
    color: #9ca3af;
}

.markdown-content.prose code {
    background-color: #f3f4f6;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875em;
}

.dark .markdown-content.prose code {
    background-color: #374151;
}

.markdown-content.prose pre {
    background-color: #f3f4f6;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1rem 0;
}

.dark .markdown-content.prose pre {
    background-color: #1f2937;
}

.markdown-content.prose pre code {
    background-color: transparent;
    padding: 0;
}

.markdown-content.prose ul,
.markdown-content.prose ol {
    margin: 1rem 0;
    padding-left: 1.5rem;
}

.markdown-content.prose li {
    margin: 0.25rem 0;
}

.markdown-content.prose a {
    color: #3b82f6;
    text-decoration: underline;
}

.markdown-content.prose a:hover {
    color: #1d4ed8;
}

.dark .markdown-content.prose a {
    color: #60a5fa;
}

.dark .markdown-content.prose a:hover {
    color: #3b82f6;
}

.markdown-content.prose img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1rem 0;
}

.markdown-content.prose table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
}

.markdown-content.prose th,
.markdown-content.prose td {
    border: 1px solid #e5e7eb;
    padding: 0.5rem;
    text-align: left;
}

.dark .markdown-content.prose th,
.dark .markdown-content.prose td {
    border-color: #374151;
}

.markdown-content.prose th {
    background-color: #f9fafb;
    font-weight: 600;
}

.dark .markdown-content.prose th {
    background-color: #1f2937;
}

/* Media container styles - exact copy from KillComments but without width constraints */
.markdown-content .video-container,
.markdown-content .gif-container {
    position: relative;
    width: 100%;
    margin: 1em auto;
}

.markdown-content .image-container,
.markdown-content .embed-container {
    margin: 1em 0;
    position: relative;
}

.markdown-content .media-source {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    text-align: right;
}

.markdown-content .source-link {
    display: inline-flex;
    align-items: center;
    color: #9ca3af;
    text-decoration: none;
}

.markdown-content .source-link:hover {
    color: #4fc3f7;
    text-decoration: underline;
}

.markdown-content .video-container iframe {
    width: 100%;
    height: 315px;
    border: none;
}

.markdown-content .image-container img,
.markdown-content .gif-container img {
    max-width: 100%;
    height: auto;
    border-radius: 0.25rem;
}

.markdown-content .gif-container iframe {
    width: 100%;
    border: none;
    border-radius: 0.25rem;
}

.markdown-content .video-container video {
    max-width: 100%;
    max-height: 80vh;
    margin: 0 auto;
    display: block;
}

.markdown-content .media-container {
    margin: 1em 0;
    position: relative;
}
</style>
