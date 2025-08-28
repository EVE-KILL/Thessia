/**
 * Composable for handling custom navigation in custom domains
 */
export const useCustomNavigation = () => {
    const { isCustomDomain, navigation } = useDomainContext();
    const { t } = useI18n();

    /**
     * Get custom navigation links for a specific position
     */
    const getCustomLinks = (position: "left" | "center" | "right") => {
        if (!isCustomDomain.value || !navigation.value?.custom_links) {
            return [];
        }

        return navigation.value.custom_links
            .filter((link: any) => {
                // For now, we'll show all custom links in the left position
                // This can be enhanced later with position-specific logic
                return (
                    link.access_level === "public" ||
                    link.access_level === "members"
                );
            })
            .sort((a: any, b: any) => a.position - b.position)
            .map((link: any) => ({
                name: link.label,
                label: link.label,
                to: link.external ? undefined : link.url,
                href: link.external ? link.url : undefined,
                icon: link.icon,
                position: position,
                children: link.dropdown_items?.map((child: any) => ({
                    name: child.label,
                    label: child.label,
                    to: child.external ? undefined : child.url,
                    href: child.external ? child.url : undefined,
                    icon: child.icon,
                })),
            }));
    };

    /**
     * Check if default navigation should be shown
     */
    const showDefaultNav = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_default_nav !== false;
    });

    /**
     * Check if search should be shown in navbar
     */
    const showSearch = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_search !== false;
    });

    /**
     * Check if user menu should be shown
     */
    const showUserMenu = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_user_menu !== false;
    });

    /**
     * Get navigation style
     */
    const getNavStyle = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return "horizontal";
        }
        return navigation.value.nav_style || "horizontal";
    });

    /**
     * Get navigation position
     */
    const getNavPosition = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return "top";
        }
        return navigation.value.nav_position || "top";
    });

    /**
     * Check if navbar should be sticky
     */
    const isNavbarSticky = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.sticky !== false;
    });

    /**
     * Merge custom navigation with default navigation
     */
    const mergeNavigation = (
        defaultNavItems: any[],
        position: "left" | "center" | "right"
    ) => {
        const customLinks = getCustomLinks(position);

        if (!showDefaultNav.value) {
            // Only show custom links
            return customLinks;
        }

        // Merge custom links with default navigation
        if (position === "left") {
            return [...customLinks, ...defaultNavItems];
        } else {
            return [...defaultNavItems, ...customLinks];
        }
    };

    return {
        getCustomLinks,
        showDefaultNav,
        showSearch,
        showUserMenu,
        getNavStyle,
        getNavPosition,
        isNavbarSticky,
        mergeNavigation,
    };
};
