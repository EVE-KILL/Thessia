export function siteBackground() {
    const image = useImage();
    const cookie = useCookie('siteBackground');

    const currentBackground = useState<string>('currentBackground', () =>
        cookie.value || '/backgrounds/bg2.png'
    );

    watch(currentBackground, (newValue) => {
        cookie.value = newValue;
    });

    const getSiteBackground = () => {
        return currentBackground;
    }

    const setSiteBackground = (path: string) => {
        currentBackground.value = path;
        return path;
    }

    const getOptimizedImageUrl = (path: string): string => {
        return image(path, {
            format: 'avif,webp',
            quality: 80
        });
    };

    return {
        getOptimizedImageUrl,
        getSiteBackground,
        setSiteBackground,
        currentBackground
    }
}
