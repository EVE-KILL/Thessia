/**
 * API endpoint to fetch all available background images from r/eveporn subreddit
 *
 * @returns Array of all image objects from Reddit
 */

export default defineCachedEventHandler(
    async (event) => {
        try {
            // Fetch the latest 100 posts from r/eveporn
            const response = await $fetch<{
                data: {
                    children: Array<{
                        data: {
                            url: string;
                            title: string;
                            thumbnail: string;
                            is_gallery?: boolean;
                            media_metadata?: Record<
                                string,
                                {
                                    s: {
                                        u: string;
                                        x: number;
                                        y: number;
                                    };
                                }
                            >;
                            gallery_data?: {
                                items: Array<{
                                    media_id: string;
                                }>;
                            };
                            preview?: {
                                images?: Array<{
                                    source: {
                                        url: string;
                                        width: number;
                                        height: number;
                                    };
                                }>;
                            };
                        };
                    }>;
                };
            }>("https://www.reddit.com/r/eveporn.json?limit=100", {
                headers: {
                    "User-Agent": "Thessia/1.0 (EVE-KILL Killboard)",
                },
            });

            const allImages: Array<{
                url: string;
                title: string;
                source: string;
                subreddit: string;
                width?: number;
                height?: number;
            }> = [];

            // Process each post
            for (const post of response.data.children) {
                const postData = post.data;
                const images: Array<{
                    url: string;
                    title: string;
                    source: string;
                    subreddit: string;
                    width?: number;
                    height?: number;
                }> = [];

                // Handle gallery posts
                if (
                    postData.is_gallery &&
                    postData.gallery_data &&
                    postData.media_metadata
                ) {
                    for (const item of postData.gallery_data.items) {
                        const mediaData =
                            postData.media_metadata[item.media_id];
                        if (mediaData?.s?.u) {
                            let imageUrl = mediaData.s.u.replace(/&amp;/g, "&");
                            images.push({
                                url: imageUrl,
                                title: `${postData.title} (Gallery Image)`,
                                source: "reddit",
                                subreddit: "eveporn",
                                width: mediaData.s.x,
                                height: mediaData.s.y,
                            });
                        }
                    }
                } else {
                    // Handle single image posts
                    const url = postData.url;

                    // Check for direct image links or imgur links
                    if (
                        url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                        url.includes("imgur.com") ||
                        url.includes("i.redd.it")
                    ) {
                        let imageUrl = url;

                        // Handle imgur links - convert to direct image links
                        if (
                            imageUrl.includes("imgur.com") &&
                            !imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                        ) {
                            // Convert imgur gallery/post links to direct image links
                            const imgurId = imageUrl
                                .split("/")
                                .pop()
                                ?.split(".")[0];
                            if (imgurId) {
                                imageUrl = `https://i.imgur.com/${imgurId}.jpg`;
                            }
                        }

                        // Try to get higher quality image from preview if available
                        if (postData.preview?.images?.[0]?.source) {
                            const previewUrl =
                                postData.preview.images[0].source.url;
                            // Decode HTML entities in the URL
                            imageUrl = previewUrl.replace(/&amp;/g, "&");
                        }

                        images.push({
                            url: imageUrl,
                            title: postData.title,
                            source: "reddit",
                            subreddit: "eveporn",
                            width: postData.preview?.images?.[0]?.source?.width,
                            height: postData.preview?.images?.[0]?.source
                                ?.height,
                        });
                    }
                }

                // Add all images from this post to the main array
                allImages.push(...images);
            }

            if (allImages.length === 0) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "No images found in subreddit",
                });
            }

            return {
                images: allImages,
                count: allImages.length,
                source: "reddit",
                subreddit: "eveporn",
                fetched_at: new Date().toISOString(),
            };
        } catch (error) {
            console.error("Error fetching Reddit backgrounds:", error);

            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch Reddit backgrounds",
            });
        }
    },
    {
        maxAge: 1800, // Cache for 30 minutes since we're returning all images
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            // Static key since we're returning all images, not random ones
            return `site:backgrounds:reddit:all`;
        },
    }
);
