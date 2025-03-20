export function siteBackground() {
    const image = useImage();
    const cookie = useCookie('siteBackground');

    // Create a reactive ref to track the current background
    const currentBackground = ref<string>(cookie.value || '/backgrounds/images/bg2.png');

    // Watch for changes to the ref and update the cookie
    watch(currentBackground, (newValue) => {
        cookie.value = newValue;
    });

    const getSiteBackground = () => {
        return currentBackground.value;
    }

    const setSiteBackground = (path: string) => {
        // Update the reactive ref - this will trigger reactivity
        currentBackground.value = path;
        return path;
    }

    const getOptimizedImageUrl = (path: string): string => {
        return image(path, {
            format: 'webp',
            quality: 80
        });
    };

    return {
        getOptimizedImageUrl,
        getSiteBackground,
        setSiteBackground
    }
}
