// Custom domain related interfaces

export interface ICustomBranding {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    favicon_url?: string;
    custom_css?: string;
    header_title?: string;
    show_eve_kill_branding: boolean;
}

export interface IDomainAnalytics {
    total_visits: number;
    unique_visitors: number;
    last_visit?: Date;
    top_pages: Array<{
        path: string;
        visits: number;
    }>;
}

export interface IRateLimit {
    requests_per_hour: number;
    current_usage: number;
    reset_time: Date;
}

export interface ICustomDomain {
    domain_id: string;
    domain: string;
    entity_type: "character" | "corporation" | "alliance";
    entity_id: number;
    owner_character_id: number;

    // Configuration
    default_page: string;
    branding: ICustomBranding;

    // Domain Management
    verified: boolean;
    verification_token: string;
    verification_method?: "dns" | "meta" | "file";
    dns_verified_at?: Date;
    ssl_enabled: boolean;

    // Settings
    public_campaigns: boolean;
    analytics_enabled: boolean;
    analytics?: IDomainAnalytics;

    // Timestamps
    created_at: Date;
    updated_at: Date;
    expires_at?: Date;
    last_accessed?: Date;

    // Status
    active: boolean;
    suspended: boolean;
    suspension_reason?: string;

    // Rate limiting
    rate_limit?: IRateLimit;
}

// Domain context for request handling
export interface IDomainContext {
    isCustomDomain: boolean;
    domain?: string;
    config?: ICustomDomain;
    entity?: any; // Will be ICharacter | ICorporation | IAlliance
    entityType?: "character" | "corporation" | "alliance";
}

// Domain verification response
export interface IDomainVerification {
    success: boolean;
    method: "dns" | "meta" | "file";
    verified_at?: Date;
    error?: string;
}

// Domain creation request
export interface ICreateDomainRequest {
    domain: string;
    entity_type: "character" | "corporation" | "alliance";
    entity_id: number;
    default_page?: string;
    branding?: Partial<ICustomBranding>;
    public_campaigns?: boolean;
}

// Domain update request
export interface IUpdateDomainRequest {
    default_page?: string;
    branding?: Partial<ICustomBranding>;
    public_campaigns?: boolean;
    analytics_enabled?: boolean;
}
