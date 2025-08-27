import { type Document, type Model, Schema, model } from "mongoose";

// Interface for custom branding configuration
interface ICustomBranding {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    favicon_url?: string;
    custom_css?: string;
    header_title?: string;
    show_eve_kill_branding: boolean;
}

// Interface for domain analytics
interface IDomainAnalytics {
    total_visits: number;
    unique_visitors: number;
    last_visit?: Date;
    top_pages: Array<{
        path: string;
        visits: number;
    }>;
}

// Import the interface from the dedicated interfaces file
import type { ICustomDomain } from "../interfaces/ICustomDomain";

export interface ICustomDomainDocument extends ICustomDomain, Document {}

// Sub-schema for branding configuration
const brandingSchema = new Schema<ICustomBranding>(
    {
        primary_color: {
            type: String,
            match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
            default: "#3b82f6", // Default blue
        },
        secondary_color: {
            type: String,
            match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
            default: "#6b7280", // Default gray
        },
        logo_url: {
            type: String,
            validate: {
                validator: function (v: string) {
                    if (!v) return true; // Optional field
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
                    if (!v) return true; // Optional field
                    return /^https?:\/\/.+\.(ico|png|gif|svg)$/i.test(v);
                },
                message: "Favicon URL must be a valid icon URL",
            },
        },
        custom_css: {
            type: String,
            maxlength: 50000, // Limit custom CSS size
        },
        header_title: {
            type: String,
            maxlength: 100,
        },
        show_eve_kill_branding: {
            type: Boolean,
            default: true,
        },
    },
    { _id: false }
);

// Sub-schema for analytics
const analyticsSchema = new Schema<IDomainAnalytics>(
    {
        total_visits: { type: Number, default: 0 },
        unique_visitors: { type: Number, default: 0 },
        last_visit: { type: Date },
        top_pages: [
            {
                path: { type: String, required: true },
                visits: { type: Number, default: 0 },
            },
        ],
    },
    { _id: false }
);

// Sub-schema for rate limiting
const rateLimitSchema = new Schema(
    {
        requests_per_hour: { type: Number, default: 1000 },
        current_usage: { type: Number, default: 0 },
        reset_time: { type: Date, default: Date.now },
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
        entity_type: {
            type: String,
            required: true,
            enum: ["character", "corporation", "alliance"],
            index: true,
        },
        entity_id: {
            type: Number,
            required: true,
            index: true,
        },
        owner_character_id: {
            type: Number,
            required: true,
            index: true,
        },

        // Configuration
        default_page: {
            type: String,
            default: "dashboard",
            enum: [
                "dashboard",
                "kills",
                "losses",
                "combined",
                "stats",
                "members",
                "corporations",
                "characters",
                "top",
                "battles",
                "campaigns",
            ],
        },
        branding: {
            type: brandingSchema,
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
        analytics_enabled: {
            type: Boolean,
            default: true,
        },
        analytics: {
            type: analyticsSchema,
            default: () => ({}),
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

        // Rate limiting
        rate_limit: {
            type: rateLimitSchema,
            default: () => ({}),
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

// Indexes for performance
customDomainSchema.index({ domain: 1, active: 1, verified: 1 }); // Primary lookup
customDomainSchema.index({ owner_character_id: 1, active: 1 }); // User's domains
customDomainSchema.index({ entity_type: 1, entity_id: 1 }); // Entity domains

// Text index for domain search
customDomainSchema.index({
    domain: "text",
    "branding.header_title": "text",
});

// Compound index for analytics queries
customDomainSchema.index({
    analytics_enabled: 1,
    last_accessed: -1,
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
        entity_type: entityType,
        entity_id: entityId,
        active: true,
        verified: true,
    });
};

// Instance methods
customDomainSchema.methods.updateAnalytics = function (path: string) {
    if (!this.analytics_enabled) return;

    this.analytics.total_visits += 1;
    this.analytics.last_visit = new Date();
    this.last_accessed = new Date();

    // Update top pages
    const existingPage = this.analytics.top_pages.find(
        (p: any) => p.path === path
    );
    if (existingPage) {
        existingPage.visits += 1;
    } else {
        this.analytics.top_pages.push({ path, visits: 1 });
    }

    // Keep only top 10 pages
    this.analytics.top_pages.sort((a: any, b: any) => b.visits - a.visits);
    this.analytics.top_pages = this.analytics.top_pages.slice(0, 10);

    return this.save();
};

customDomainSchema.methods.checkRateLimit = function (): boolean {
    if (!this.rate_limit) return true;

    const now = new Date();

    // Reset if hour has passed
    if (now.getTime() > this.rate_limit.reset_time.getTime()) {
        this.rate_limit.current_usage = 0;
        this.rate_limit.reset_time = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    }

    return this.rate_limit.current_usage < this.rate_limit.requests_per_hour;
};

customDomainSchema.methods.incrementRateLimit = function () {
    if (!this.rate_limit) return;
    this.rate_limit.current_usage += 1;
};

export const CustomDomains: Model<ICustomDomainDocument> =
    model<ICustomDomainDocument>(
        "customdomains",
        customDomainSchema,
        "customdomains"
    );
