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

// Flexible configuration - allows any key/value pairs
export interface IFlexibleConfiguration {
    [key: string]: any; // Allow any configuration values
    // Common examples that users might define:
    // primary_color?: string;
    // welcome_message?: string;
    // logo_url?: string;
    // show_hero?: boolean;
    // custom_font?: string;
    // theme_mode?: string;
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

// Dashboard template interface (modular system)
export interface IDomainDashboardTemplate {
    enabled?: boolean;
    html_template?: string;
    custom_css?: string;
    template_name?: string;
    template_description?: string;
    template_version?: string;
    created_at?: Date;
    updated_at?: Date;
}

// Dashboard template interface (legacy system - keep for compatibility)
export interface IDashboardTemplate {
    name: string;
    template: string;
    description?: string;
    created_at: Date;
    updated_at: Date;
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

// Main Custom Domain interface (simplified)
export interface ICustomDomain {
    domain_id: string;
    domain: string;
    owner_character_id: number;

    // Multi-entity support
    entities: IEntityConfig[];

    // Custom navigation
    navigation: INavigationConfig;

    // Flexible configuration - any key/value pairs
    configuration: IFlexibleConfiguration;

    // Single dashboard template (new system)
    dashboard_template?: IDomainDashboardTemplate;

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

    // Dashboard template data (for SSR)
    dashboardTemplate?: {
        enabled: boolean;
        template?: string;
        customCss?: string;
        isDefault?: boolean;
    };

    // Error state
    error?: {
        type: string;
        message: string;
    };
}

// Domain verification response
export interface IDomainVerification {
    success: boolean;
    method: "dns" | "meta" | "file";
    verified_at?: Date;
    error?: string;
}

// Enhanced domain creation request (simplified)
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

    // Flexible configuration
    configuration?: IFlexibleConfiguration;
    navigation?: Partial<INavigationConfig>;
    public_campaigns?: boolean;
}

// Enhanced domain update request (simplified)
export interface IUpdateDomainRequest {
    entities?: IEntityConfig[];
    configuration?: IFlexibleConfiguration;
    navigation?: Partial<INavigationConfig>;
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
