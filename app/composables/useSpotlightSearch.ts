/**
 * Global spotlight search state and keyboard shortcuts
 */
export const useSpotlightSearch = () => {
    const isOpen = ref(false);

    const openSearch = () => {
        isOpen.value = true;
    };

    const closeSearch = () => {
        isOpen.value = false;
    };

    const toggleSearch = () => {
        isOpen.value = !isOpen.value;
    };

    // Keyboard shortcut handling
    const handleKeyboard = (event: KeyboardEvent) => {
        // Cmd/Ctrl + K to open search
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
            event.preventDefault();
            event.stopPropagation();
            
            // Don't open if user is typing in an input/textarea
            const target = event.target as HTMLElement;
            const isTyping = target?.tagName === 'INPUT' || 
                           target?.tagName === 'TEXTAREA' || 
                           target?.contentEditable === 'true';
            
            if (!isTyping) {
                toggleSearch();
            }
        }
        
        // Escape to close search
        if (event.key === 'Escape' && isOpen.value) {
            closeSearch();
        }
    };

    // Setup keyboard listeners on client side only
    onMounted(() => {
        if (process.client) {
            document.addEventListener('keydown', handleKeyboard);
        }
    });

    onUnmounted(() => {
        if (process.client) {
            document.removeEventListener('keydown', handleKeyboard);
        }
    });

    return {
        isOpen: readonly(isOpen),
        openSearch,
        closeSearch,
        toggleSearch,
    };
};
