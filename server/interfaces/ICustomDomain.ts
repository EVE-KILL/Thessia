// Custom domain related interfaces - Phase 2

// Multi-entity configuration
export interface IEntityConfig {
    entity_type: "character" | "corporation" | "alliance";
    entity_id: number;
    display_name?: string; // Optional custom name override
    show_in_nav: boolean; // Show in navigation menu
    show_in_stats: boolean; // Include in statistics
    primary: boolean; // Is this the primary entity?
    color_code?: string; // Custom color for this entity
}

// Enhanced branding system
export interface ICustomBranding {
    // Color scheme
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    background_color?: string;
    text_color?: string;

    // Images
    logo_url?: string;
    favicon_url?: string;
    banner_image_url?: string;
    background_image_url?: string;

    // Typography
    header_title?: string;
    welcome_message?: string;
    secondary_message?: string;
    font_family?: string;
    font_size_base?: number;

    // Call-to-action buttons
    cta_buttons?: Array<{
        text: string;
        url: string;
        primary: boolean;
        external: boolean;
    }>;

    // CSS customization
    custom_css?: string;
    css_variables?: Record<string, string>;

    // Theme settings
    show_eve_kill_branding: boolean;
    theme_mode: "light" | "dark" | "auto";

    // UI enhancements
    border_radius?: string;
    shadow_intensity?: "none" | "light" | "medium" | "heavy";
}

// Custom navigation configuration
export interface INavigationConfig {
    show_default_nav: boolean;
    sticky: boolean;
    // Per-icon visibility controls
    show_home?: boolean;
    show_kills?: boolean;
    show_wars?: boolean;
    show_battles?: boolean;
    show_campaigns?: boolean;
    show_stats?: boolean;
    show_tools?: boolean;
    show_search?: boolean;
    show_upload?: boolean;
    show_theme_toggle?: boolean;
    show_background_switcher?: boolean;
    show_info_menu?: boolean;
    show_user_menu?: boolean;
    custom_links: ICustomNavLink[];
}

export interface ICustomNavLink {
    label: string;
    url: string;
    external: boolean;
    icon?: string; // Icon class or SVG
    position: number; // Order in navigation
    dropdown_items?: ICustomNavLink[]; // For dropdown menus
    access_level: "public" | "members" | "admin";
}

// Simple page configuration (checkbox-based)
export interface ISimplePageConfig {
    layout: "default" | "compact" | "detailed"; // Predefined layout options

    // Component toggles - simple on/off switches
    components: {
        recent_kills: boolean;
        top_pilots: boolean;
        campaigns: boolean;
        battles: boolean;
        stats_overview: boolean;
        search_widget: boolean;
        news_feed: boolean;
        social_links: boolean;
    };

    // Simple component settings
    component_settings: {
        recent_kills_count: number; // 5, 10, 20, 50
        top_pilots_count: number; // 5, 10, 15
        time_range: "24h" | "7d" | "30d" | "all";
        show_losses: boolean;
        show_involved_kills: boolean;
    };
}

// Domain features configuration
export interface IDomainFeatures {
    show_hero: boolean;
    show_stats: boolean;
    show_tracking_overview: boolean;
    show_campaigns: boolean;
    show_most_valuable: boolean;
    show_top_boxes: boolean;
    show_ship_analysis: boolean;
    featured_campaign_id?: string;
}

// Domain usage tracking
export interface IDomainUsage {
    user_character_id: number;
    domains_count: number; // Current count
    domains_limit: number; // 10 for regular users
    total_domains_created: number;
    domains_deleted: number;
    created_at: Date;
    updated_at: Date;
}

// Phase 2 Custom Domain interface
export interface ICustomDomain {
    domain_id: string;
    domain: string;
    owner_character_id: number;

    // Multi-entity support
    entities: IEntityConfig[];

    // Enhanced branding
    branding: ICustomBranding;

    // Custom navigation
    navigation: INavigationConfig;

    // Simple page configuration
    page_config: ISimplePageConfig;

    // Domain features
    features: IDomainFeatures;

    // Domain Management
    verified: boolean;
    verification_token: string;
    verification_method?: "dns";
    dns_verified_at?: Date;
    ssl_enabled: boolean;

    // Settings
    public_campaigns: boolean;

    // Timestamps
    created_at: Date;
    updated_at: Date;
    expires_at?: Date;
    last_accessed?: Date;

    // Status
    active: boolean;
    suspended: boolean;
    suspension_reason?: string;
}

// Enhanced domain context for multi-entity support
export interface IDomainContext {
    isCustomDomain: boolean;
    domain?: string;
    config?: ICustomDomain;

    // Multi-entity support
    entities?: any[]; // Array of ICharacter | ICorporation | IAlliance
    primaryEntity?: any; // The primary entity
    entityTypes?: ("character" | "corporation" | "alliance")[];
}

// Domain verification response
export interface IDomainVerification {
    success: boolean;
    method: "dns" | "meta" | "file";
    verified_at?: Date;
    error?: string;
}

// Enhanced domain creation request
export interface ICreateDomainRequest {
    domain: string;

    // Multi-entity support
    entities: {
        entity_type: "character" | "corporation" | "alliance";
        entity_id: number;
        display_name?: string;
        show_in_nav?: boolean;
        show_in_stats?: boolean;
        primary?: boolean;
    }[];

    // Enhanced configuration
    branding?: Partial<ICustomBranding>;
    navigation?: Partial<INavigationConfig>;
    page_config?: Partial<ISimplePageConfig>;
    public_campaigns?: boolean;
}

// Enhanced domain update request
export interface IUpdateDomainRequest {
    entities?: IEntityConfig[];
    branding?: Partial<ICustomBranding>;
    navigation?: Partial<INavigationConfig>;
    page_config?: Partial<ISimplePageConfig>;
    public_campaigns?: boolean;
}

// Entity management requests
export interface IAddEntityRequest {
    entity_type: "character" | "corporation" | "alliance";
    entity_id: number;
    display_name?: string;
    show_in_nav?: boolean;
    show_in_stats?: boolean;
    primary?: boolean;
}

export interface IUpdateEntityRequest {
    display_name?: string;
    show_in_nav?: boolean;
    show_in_stats?: boolean;
    primary?: boolean;
    color_code?: string;
}
