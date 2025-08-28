import { type Document, type Model, Schema, model } from "mongoose";

// Import the interface from the dedicated interfaces file
import type {
    ICustomBranding,
    ICustomDomain,
    ICustomNavLink,
    IDomainFeatures,
    IDomainUsage,
    IEntityConfig,
    INavigationConfig,
    ISimplePageConfig,
} from "../interfaces/ICustomDomain";

export interface ICustomDomainDocument extends ICustomDomain, Document {}
export interface IDomainUsageDocument extends IDomainUsage, Document {}

// Sub-schema for entity configuration
const entityConfigSchema = new Schema<IEntityConfig>(
    {
        entity_type: {
            type: String,
            required: true,
            enum: ["character", "corporation", "alliance"],
        },
        entity_id: {
            type: Number,
            required: true,
        },
        display_name: {
            type: String,
            maxlength: 100,
        },
        show_in_nav: {
            type: Boolean,
            default: true,
        },
        show_in_stats: {
            type: Boolean,
            default: true,
        },
        primary: {
            type: Boolean,
            default: false,
        },
        color_code: {
            type: String,
            match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        },
    },
    { _id: false }
);

// Sub-schema for enhanced branding configuration
const brandingSchema = new Schema<ICustomBranding>(
    {
        // Color scheme
        primary_color: {
            type: String,
            match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
            default: "#3b82f6",
        },
        secondary_color: {
            type: String,
            match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
            default: "#6b7280",
        },
        accent_color: {
            type: String,
            match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        },
        background_color: {
            type: String,
            match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        },
        text_color: {
            type: String,
            match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        },

        // Images
        logo_url: {
            type: String,
            validate: {
                validator: function (v: string) {
                    if (!v) return true;
                    return /^https?:\/\/.+\.(jpg|jpeg|png|gif|svg|webp)$/i.test(
                        v
                    );
                },
                message: "Logo URL must be a valid image URL",
            },
        },
        favicon_url: {
            type: String,
            validate: {
                validator: function (v: string) {
                    if (!v) return true;
                    return /^https?:\/\/.+\.(ico|png|gif|svg)$/i.test(v);
                },
                message: "Favicon URL must be a valid icon URL",
            },
        },
        banner_image_url: {
            type: String,
            validate: {
                validator: function (v: string) {
                    if (!v) return true;
                    return /^https?:\/\/.+\.(jpg|jpeg|png|gif|svg|webp)$/i.test(
                        v
                    );
                },
                message: "Banner image URL must be a valid image URL",
            },
        },
        background_image_url: {
            type: String,
            validate: {
                validator: function (v: string) {
                    if (!v) return true;
                    return /^https?:\/\/.+\.(jpg|jpeg|png|gif|svg|webp)$/i.test(
                        v
                    );
                },
                message: "Background image URL must be a valid image URL",
            },
        },

        // Typography
        header_title: {
            type: String,
            maxlength: 100,
        },
        welcome_message: {
            type: String,
            maxlength: 500,
        },
        secondary_message: {
            type: String,
            maxlength: 300,
        },
        cta_buttons: [
            {
                text: {
                    type: String,
                    required: true,
                    maxlength: 50,
                },
                url: {
                    type: String,
                    required: true,
                    maxlength: 500,
                },
                primary: {
                    type: Boolean,
                    default: false,
                },
                external: {
                    type: Boolean,
                    default: true,
                },
            },
        ],
        font_family: {
            type: String,
            maxlength: 100,
        },
        font_size_base: {
            type: Number,
            min: 10,
            max: 24,
            default: 16,
        },

        // CSS customization
        custom_css: {
            type: String,
            maxlength: 100000, // Increased limit for Phase 2
        },
        css_variables: {
            type: Map,
            of: String,
        },

        // Theme settings
        show_eve_kill_branding: {
            type: Boolean,
            default: true,
        },
        theme_mode: {
            type: String,
            enum: ["light", "dark", "auto"],
            default: "auto",
        },

        // UI enhancements
        border_radius: {
            type: String,
            default: "0.375rem",
        },
        shadow_intensity: {
            type: String,
            enum: ["none", "light", "medium", "heavy"],
            default: "medium",
        },
    },
    { _id: false }
);

// Sub-schema for custom navigation links
const customNavLinkSchema = new Schema<ICustomNavLink>(
    {
        label: {
            type: String,
            required: true,
            maxlength: 50,
        },
        url: {
            type: String,
            required: true,
            maxlength: 500,
        },
        external: {
            type: Boolean,
            default: false,
        },
        icon: {
            type: String,
            maxlength: 100,
        },
        position: {
            type: Number,
            required: true,
        },
        access_level: {
            type: String,
            enum: ["public", "members", "admin"],
            default: "public",
        },
    },
    { _id: false }
);

// Add dropdown_items as a self-referencing array after schema definition
customNavLinkSchema.add({
    dropdown_items: [customNavLinkSchema],
});

// Sub-schema for navigation configuration
const navigationSchema = new Schema<INavigationConfig>(
    {
        show_default_nav: {
            type: Boolean,
            default: true,
        },
        nav_style: {
            type: String,
            enum: ["horizontal", "sidebar", "dropdown"],
            default: "horizontal",
        },
        custom_links: [customNavLinkSchema],
        nav_position: {
            type: String,
            enum: ["top", "side", "bottom"],
            default: "top",
        },
        show_search: {
            type: Boolean,
            default: true,
        },
        show_user_menu: {
            type: Boolean,
            default: true,
        },
        sticky: {
            type: Boolean,
            default: true,
        },
    },
    { _id: false }
);

// Sub-schema for simple page configuration
const simplePageConfigSchema = new Schema<ISimplePageConfig>(
    {
        layout: {
            type: String,
            enum: ["default", "compact", "detailed"],
            default: "default",
        },

        // Component toggles
        components: {
            recent_kills: { type: Boolean, default: true },
            top_pilots: { type: Boolean, default: true },
            campaigns: { type: Boolean, default: true },
            battles: { type: Boolean, default: true },
            stats_overview: { type: Boolean, default: true },
            search_widget: { type: Boolean, default: true },
            news_feed: { type: Boolean, default: false },
            social_links: { type: Boolean, default: false },
        },

        // Component settings
        component_settings: {
            recent_kills_count: {
                type: Number,
                enum: [5, 10, 20, 50],
                default: 10,
            },
            top_pilots_count: {
                type: Number,
                enum: [5, 10, 15],
                default: 10,
            },
            time_range: {
                type: String,
                enum: ["24h", "7d", "30d", "all"],
                default: "7d",
            },
            show_losses: {
                type: Boolean,
                default: true,
            },
            show_involved_kills: {
                type: Boolean,
                default: true,
            },
        },
    },
    { _id: false }
);

// Sub-schema for domain features configuration
const featuresSchema = new Schema<IDomainFeatures>(
    {
        show_campaigns: {
            type: Boolean,
            default: true,
        },
        featured_campaign_id: {
            type: String,
            maxlength: 100,
        },
    },
    { _id: false }
);

// Main CustomDomain schema
const customDomainSchema = new Schema<ICustomDomainDocument>(
    {
        domain_id: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        domain: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
            validate: {
                validator: function (v: string) {
                    // Basic domain validation regex
                    return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/.test(
                        v
                    );
                },
                message: "Invalid domain format",
            },
        },
        owner_character_id: {
            type: Number,
            required: true,
            index: true,
        },

        // Multi-entity support
        entities: {
            type: [entityConfigSchema],
            required: true,
            validate: {
                validator: function (entities: IEntityConfig[]) {
                    if (!entities || entities.length === 0) return false;
                    if (entities.length > 10) return false; // Maximum 10 entities

                    // Ensure exactly one primary entity
                    const primaryCount = entities.filter(
                        (e) => e.primary
                    ).length;
                    return primaryCount === 1;
                },
                message:
                    "Must have 1-10 entities with exactly one primary entity",
            },
        },

        // Enhanced branding
        branding: {
            type: brandingSchema,
            default: () => ({}),
        },

        // Custom navigation
        navigation: {
            type: navigationSchema,
            default: () => ({}),
        },

        // Simple page configuration
        page_config: {
            type: simplePageConfigSchema,
            default: () => ({}),
        },

        // Domain features
        features: {
            type: featuresSchema,
            default: () => ({}),
        },

        // Domain Management
        verified: {
            type: Boolean,
            default: false,
            index: true,
        },
        verification_token: {
            type: String,
            required: true,
            index: true,
        },
        verification_method: {
            type: String,
            enum: ["dns", "meta", "file"],
        },
        dns_verified_at: { type: Date },
        ssl_enabled: {
            type: Boolean,
            default: false,
        },

        // Settings
        public_campaigns: {
            type: Boolean,
            default: true,
        },

        // Timestamps
        created_at: {
            type: Date,
            default: Date.now,
            index: true,
        },
        updated_at: {
            type: Date,
            default: Date.now,
        },
        expires_at: {
            type: Date,
            index: true,
        },
        last_accessed: {
            type: Date,
            index: true,
        },

        // Status
        active: {
            type: Boolean,
            default: false,
            index: true,
        },
        suspended: {
            type: Boolean,
            default: false,
            index: true,
        },
        suspension_reason: {
            type: String,
            maxlength: 500,
        },
    },
    {
        collection: "customdomains",
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
        toJSON: {
            transform: (_doc: any, ret: any) => {
                delete ret._id;
                delete ret.__v;
                // Don't expose verification token in API responses
                delete ret.verification_token;
            },
        },
    }
);

// Domain usage tracking schema
const domainUsageSchema = new Schema<IDomainUsageDocument>(
    {
        user_character_id: {
            type: Number,
            required: true,
            unique: true,
            index: true,
        },
        domains_count: {
            type: Number,
            default: 0,
            min: 0,
        },
        domains_limit: {
            type: Number,
            default: 10,
            min: 1,
        },
        total_domains_created: {
            type: Number,
            default: 0,
            min: 0,
        },
        domains_deleted: {
            type: Number,
            default: 0,
            min: 0,
        },
        created_at: {
            type: Date,
            default: Date.now,
        },
        updated_at: {
            type: Date,
            default: Date.now,
        },
    },
    {
        collection: "domainusage",
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

// Indexes for performance
customDomainSchema.index({ domain: 1, active: 1, verified: 1 }); // Primary lookup
customDomainSchema.index({ owner_character_id: 1, active: 1 }); // User's domains
customDomainSchema.index({
    "entities.entity_type": 1,
    "entities.entity_id": 1,
}); // Multi-entity lookup

// Text index for domain search
customDomainSchema.index({
    domain: "text",
    "branding.header_title": "text",
});

// Pre-save middleware to generate domain_id and verification_token
customDomainSchema.pre("save", function (next) {
    if (this.isNew) {
        // Generate unique domain_id
        if (!this.domain_id) {
            this.domain_id = `dom_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
        }

        // Generate verification token
        if (!this.verification_token) {
            this.verification_token = `verify_${Math.random()
                .toString(36)
                .substr(2, 32)}`;
        }
    }

    // Always update the updated_at timestamp
    this.updated_at = new Date();

    next();
});

// Static methods
customDomainSchema.statics.findByDomain = function (domain: string) {
    return this.findOne({
        domain: domain.toLowerCase(),
        active: true,
        verified: true,
    });
};

customDomainSchema.statics.findByOwner = function (characterId: number) {
    return this.find({
        owner_character_id: characterId,
    }).sort({ created_at: -1 });
};

customDomainSchema.statics.findByEntity = function (
    entityType: string,
    entityId: number
) {
    return this.find({
        "entities.entity_type": entityType,
        "entities.entity_id": entityId,
        active: true,
        verified: true,
    });
};

customDomainSchema.statics.countByOwner = function (characterId: number) {
    return this.countDocuments({
        owner_character_id: characterId,
        active: true,
    });
};

// Instance methods
customDomainSchema.methods.getPrimaryEntity = function () {
    return this.entities.find((entity: IEntityConfig) => entity.primary);
};

customDomainSchema.methods.updateLastAccessed = function () {
    this.last_accessed = new Date();
    return this.save();
};

customDomainSchema.methods.addEntity = function (entityConfig: IEntityConfig) {
    if (this.entities.length >= 10) {
        throw new Error("Maximum 10 entities per domain");
    }

    // If this is set as primary, unset other primaries
    if (entityConfig.primary) {
        this.entities.forEach((entity: IEntityConfig) => {
            entity.primary = false;
        });
    }

    this.entities.push(entityConfig);
    return this.save();
};

customDomainSchema.methods.removeEntity = function (
    entityType: string,
    entityId: number
) {
    const initialLength = this.entities.length;
    this.entities = this.entities.filter(
        (entity: IEntityConfig) =>
            !(
                entity.entity_type === entityType &&
                entity.entity_id === entityId
            )
    );

    if (this.entities.length === initialLength) {
        throw new Error("Entity not found");
    }

    if (this.entities.length === 0) {
        throw new Error("Cannot remove last entity");
    }

    // Ensure there's still a primary entity
    const hasPrimary = this.entities.some(
        (entity: IEntityConfig) => entity.primary
    );
    if (!hasPrimary && this.entities.length > 0) {
        this.entities[0].primary = true;
    }

    return this.save();
};

// Static methods for domain usage tracking
domainUsageSchema.statics.getOrCreateUsage = async function (
    characterId: number
) {
    let usage = await this.findOne({ user_character_id: characterId });
    if (!usage) {
        usage = new this({
            user_character_id: characterId,
            domains_count: 0,
            domains_limit: 10,
            total_domains_created: 0,
            domains_deleted: 0,
        });
        await usage.save();
    }
    return usage;
};

domainUsageSchema.methods.canCreateDomain = function () {
    return this.domains_count < this.domains_limit;
};

domainUsageSchema.methods.incrementDomain = function () {
    this.domains_count += 1;
    this.total_domains_created += 1;
    return this.save();
};

domainUsageSchema.methods.decrementDomain = function () {
    if (this.domains_count > 0) {
        this.domains_count -= 1;
        this.domains_deleted += 1;
    }
    return this.save();
};

export const CustomDomains: Model<ICustomDomainDocument> =
    model<ICustomDomainDocument>(
        "customdomains",
        customDomainSchema,
        "customdomains"
    );

export const DomainUsage: Model<IDomainUsageDocument> =
    model<IDomainUsageDocument>(
        "domainusage",
        domainUsageSchema,
        "domainusage"
    );
