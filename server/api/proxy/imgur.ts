import { LRUCache } from "lru-cache";

// Define the result type
interface ImgurProxyResult {
    mediaUrl: string; // URL for the resolved media
    mediaType: string; // Type: 'image', 'video', or 'gif'
    timestamp: number; // When the result was cached
    originalUrl: string; // Original URL for debugging
    cacheKey: string; // Cache key for this request (helps with debugging)
}

// Create a cache for Imgur URL resolutions to reduce API calls
const imgurCache = new LRUCache<string, ImgurProxyResult>({
    max: 500, // Store up to 500 resolved URLs
    ttl: 1000 * 60 * 10, // Cache for 10 minutes only
});

export default defineEventHandler(async (event) => {
    try {
        // Get the request body
        const body = await readBody(event);
        const { url } = body;

        if (!url || typeof url !== "string") {
            return createError({
                statusCode: 400,
                message: "URL is required",
            });
        }

        // Cleanup and normalize the URL to create a consistent cache key
        const cacheKey = url
            .trim()
            .replace(/\/+$/, "") // Remove trailing slashes
            .split(/[?#]/)[0]; // Remove query parameters or fragments

        cliLogger.debug(
            `Imgur proxy request for URL: ${url}, cache key: ${cacheKey}`
        );

        // Check cache first
        const cachedResult = imgurCache.get(cacheKey);
        if (cachedResult) {
            cliLogger.debug(`Using cached Imgur result for: ${cacheKey}`);
            return cachedResult;
        }

        // Convert URL to the JSON endpoint format
        const jsonUrl = convertToJsonUrl(url);
        cliLogger.debug(`Fetching from: ${jsonUrl}`);

        // Fetch the JSON data from Imgur
        const response = await fetch(jsonUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                Referer: "https://imgur.com/",
            },
            cache: "no-store", // Avoid caching
        });

        if (!response.ok) {
            cliLogger.error(
                `Failed to fetch Imgur JSON: ${response.status} ${response.statusText}`
            );
            return createError({
                statusCode: response.status,
                message: `Failed to fetch Imgur data: ${response.statusText}`,
            });
        }

        const data = await response.json();

        // Check if we got valid data
        if (!data?.data?.image) {
            cliLogger.error(`Invalid JSON response for URL: ${url}`);
            return createError({
                statusCode: 404,
                message: "Could not find media in Imgur URL",
            });
        }

        // Process the JSON data to get media info
        const media = extractMediaFromJson(data.data.image);
        if (!media) {
            return createError({
                statusCode: 404,
                message: "Could not extract media information from Imgur JSON",
            });
        }

        // Create the result
        const result: ImgurProxyResult = {
            mediaUrl: media.url,
            mediaType: media.type,
            timestamp: Date.now(),
            originalUrl: url,
            cacheKey: cacheKey,
        };

        // Cache the result
        imgurCache.set(cacheKey, result);

        cliLogger.debug(
            `Successfully resolved Imgur URL: ${cacheKey} → ${result.mediaUrl} (${result.mediaType})`
        );

        return result;
    } catch (error) {
        cliLogger.error(`Error resolving Imgur URL: ${error}`);
        return createError({
            statusCode: 500,
            message: "Failed to resolve Imgur URL",
        });
    }
});

/**
 * Convert a regular Imgur URL to its JSON API endpoint
 */
function convertToJsonUrl(url: string): string {
    // Remove query parameters and hash fragments
    const cleanUrl = url.split(/[?#]/)[0].replace(/\/+$/, "");

    // Handle direct i.imgur.com links
    if (cleanUrl.includes("i.imgur.com/")) {
        const hash = cleanUrl.split("/").pop()?.split(".")[0];
        if (hash) {
            return `https://imgur.com/gallery/${hash}.json`;
        }
    }

    // Add .json if needed
    if (!cleanUrl.endsWith(".json")) {
        return `${cleanUrl}.json`;
    }

    return cleanUrl;
}

/**
 * Extract media information from Imgur's JSON response
 */
function extractMediaFromJson(
    imageData: any
): { url: string; type: string } | null {
    try {
        // For albums, get the first image
        if (imageData.is_album && imageData.album_images?.images?.length > 0) {
            const firstImage = imageData.album_images.images[0];
            const hash = firstImage.hash;

            // Special handling for animated GIFs that prefer video
            let ext = firstImage.ext || ".jpg";
            let type = "image";

            // GIFs that prefer video should be converted to MP4
            if (firstImage.animated) {
                if (firstImage.prefer_video) {
                    type = "video";
                    // Important: Use .mp4 instead of .gif when prefer_video is true
                    ext = ".mp4";
                } else {
                    type = "gif";
                }
            } else if (
                ext === ".mp4" ||
                ext === ".webm" ||
                firstImage.has_sound
            ) {
                type = "video";
            }

            cliLogger.debug(
                `Resolved album media: ${hash}${ext} as ${type} (animated: ${firstImage.animated}, prefer_video: ${firstImage.prefer_video})`
            );
            return {
                url: `https://i.imgur.com/${hash}${ext}`,
                type,
            };
        }
        // For single images

        const hash = imageData.album_cover || imageData.hash;

        // Special handling for animated content
        let ext = imageData.ext || ".jpg";
        let type = "image";

        // GIFs that prefer video should be converted to MP4
        if (imageData.animated) {
            if (imageData.prefer_video) {
                type = "video";
                // Important: Use .mp4 instead of .gif when prefer_video is true
                ext = ".mp4";
            } else {
                type = "gif";
            }
        } else if (ext === ".mp4" || ext === ".webm" || imageData.has_sound) {
            type = "video";
        }

        cliLogger.debug(
            `Resolved single media: ${hash}${ext} as ${type} (animated: ${imageData.animated}, prefer_video: ${imageData.prefer_video})`
        );
        return {
            url: `https://i.imgur.com/${hash}${ext}`,
            type,
        };
    } catch (error) {
        cliLogger.error(`Error extracting media from Imgur JSON: ${error}`);
        return null;
    }
}
