export function siteBackground() {
    const image = useImage();
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
                url: string;
                title: string;
                source: string;
                subreddit: string;
            }>("/api/site/backgrounds/reddit");

            currentBackground.value = response.url;
            isRedditBackground.value = true;
            redditBackgroundMeta.value = {
                title: response.title,
                source: response.source,
                subreddit: response.subreddit,
            };

            // Store in cookie as well
            cookie.value = response.url;

            return response;
        } catch (error) {
            console.error("Failed to fetch Reddit background:", error);
            throw error;
        }
    };

    const getOptimizedImageUrl = (path: string): string => {
        // If it's an external URL (like Reddit), return as-is
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }

        // Otherwise, use Nuxt's image optimization
        return image(path, {
            format: "webp",
            quality: 80,
        });
    };

    return {
        getOptimizedImageUrl,
        getSiteBackground,
        setSiteBackground,
        setRedditBackground,
        currentBackground,
        isRedditBackground,
        redditBackgroundMeta,
    };
}
