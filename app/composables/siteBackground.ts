export function siteBackground() {
    const cookie = useCookie("siteBackground");

    const currentBackground = useState<string>(
        "currentBackground",
        () => cookie.value || "/backgrounds/bg2.png"
    );

    // Track if current background is from Reddit
    const isRedditBackground = useState<boolean>(
        "isRedditBackground",
        () => false
    );

    // Store Reddit background metadata
    const redditBackgroundMeta = useState<{
        title?: string;
        source?: string;
        subreddit?: string;
    } | null>("redditBackgroundMeta", () => null);

    watch(currentBackground, (newValue) => {
        cookie.value = newValue;
    });

    const getSiteBackground = () => {
        return currentBackground;
    };

    const setSiteBackground = (path: string) => {
        currentBackground.value = path;
        isRedditBackground.value = false;
        redditBackgroundMeta.value = null;
        return path;
    };

    const setRedditBackground = async () => {
        try {
            const response = await $fetch<{
                images: Array<{
                    url: string;
                    title: string;
                    source: string;
                    subreddit: string;
                    width?: number;
                    height?: number;
                }>;
                count: number;
                source: string;
                subreddit: string;
                fetched_at: string;
            }>("/api/site/backgrounds/reddit");

            // Check if we have any images
            if (!response.images || response.images.length === 0) {
                throw new Error("No images available from Reddit");
            }

            // Pick a random image from the array on the frontend
            const randomIndex = Math.floor(
                Math.random() * response.images.length
            );
            const selectedImage = response.images[randomIndex]!; // Safe since we checked array length above

            currentBackground.value = selectedImage.url;
            isRedditBackground.value = true;
            redditBackgroundMeta.value = {
                title: selectedImage.title,
                source: selectedImage.source,
                subreddit: selectedImage.subreddit,
            };

            // Store in cookie as well
            cookie.value = selectedImage.url;

            return selectedImage;
        } catch (error) {
            console.error("Failed to fetch Reddit background:", error);
            throw error;
        }
    };

    return {
        getSiteBackground,
        setSiteBackground,
        setRedditBackground,
        currentBackground,
        isRedditBackground,
        redditBackgroundMeta,
    };
}
