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
     * Per-icon visibility controls
     */
    const showHome = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_home !== false;
    });

    const showKills = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_kills !== false;
    });

    const showWars = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_wars !== false;
    });

    const showBattles = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_battles !== false;
    });

    const showCampaigns = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_campaigns !== false;
    });

    const showStats = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_stats !== false;
    });

    const showTools = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_tools !== false;
    });

    const showSearch = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_search !== false;
    });

    const showUpload = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_upload !== false;
    });

    const showThemeToggle = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_theme_toggle !== false;
    });

    const showBackgroundSwitcher = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_background_switcher !== false;
    });

    const showInfoMenu = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_info_menu !== false;
    });

    const showUserMenu = computed(() => {
        if (!isCustomDomain.value || !navigation.value) {
            return true;
        }
        return navigation.value.show_user_menu !== false;
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
            // Put Home first, then custom links, then other default items
            const homeItem = defaultNavItems.find(
                (item) =>
                    item.to === "/" ||
                    item.name === "Home" ||
                    item.icon === "lucide:house"
            );
            const otherItems = defaultNavItems.filter(
                (item) =>
                    item.to !== "/" &&
                    item.name !== "Home" &&
                    item.icon !== "lucide:house"
            );

            if (homeItem) {
                return [homeItem, ...customLinks, ...otherItems];
            } else {
                return [...customLinks, ...defaultNavItems];
            }
        } else if (position === "right") {
            // Custom links should not appear on the right by default
            return [...defaultNavItems];
        } else {
            return [...defaultNavItems, ...customLinks];
        }
    };

    return {
        getCustomLinks,
        showDefaultNav,
        showHome,
        showKills,
        showWars,
        showBattles,
        showCampaigns,
        showStats,
        showTools,
        showSearch,
        showUpload,
        showThemeToggle,
        showBackgroundSwitcher,
        showInfoMenu,
        showUserMenu,
        isNavbarSticky,
        mergeNavigation,
    };
};
