/**
 * API endpoint to fetch random background images from r/eveporn subreddit
 *
 * @returns Random image URL from Reddit
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

            // Filter for image posts
            const imagePosts = response.data.children.filter((post) => {
                const url = post.data.url;
                // Check for direct image links or imgur links
                return (
                    url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                    url.includes("imgur.com") ||
                    url.includes("i.redd.it")
                );
            });

            if (imagePosts.length === 0) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "No images found in subreddit",
                });
            }

            // Select a random image
            const randomPost =
                imagePosts[Math.floor(Math.random() * imagePosts.length)];

            let imageUrl = randomPost.data.url;

            // Handle imgur links - convert to direct image links
            if (
                imageUrl.includes("imgur.com") &&
                !imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            ) {
                // Convert imgur gallery/post links to direct image links
                const imgurId = imageUrl.split("/").pop()?.split(".")[0];
                if (imgurId) {
                    imageUrl = `https://i.imgur.com/${imgurId}.jpg`;
                }
            }

            // Try to get higher quality image from preview if available
            if (randomPost.data.preview?.images?.[0]?.source) {
                const previewUrl = randomPost.data.preview.images[0].source.url;
                // Decode HTML entities in the URL
                imageUrl = previewUrl.replace(/&amp;/g, "&");
            }

            return {
                url: imageUrl,
                title: randomPost.data.title,
                source: "reddit",
                subreddit: "eveporn",
            };
        } catch (error) {
            console.error("Error fetching Reddit background:", error);

            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch Reddit background",
            });
        }
    },
    {
        maxAge: 300, // Cache for 5 minutes to avoid hitting Reddit API too frequently
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            // Include timestamp in cache key to ensure we get different random images
            const timestamp = Math.floor(Date.now() / (1000 * 300)); // 5-minute intervals
            return `site:backgrounds:reddit:${timestamp}`;
        },
    }
);
