/**
 * Interface for individual user setting items
 */
export interface IUserSetting {
    key: string;
    value: any;
    updatedAt?: Date;
}

/**
 * Flexible user settings - allows any key/value pairs
 */
export interface IFlexibleUserSettings {
    [key: string]: any;
}

/**
 * Setting value types
 */
export type SettingValueType =
    | "string"
    | "number"
    | "boolean"
    | "array"
    | "object";

/**
 * Validation rules for settings
 */
export interface ISettingValidation {
    type: SettingValueType;
    required?: boolean;
    min?: number; // for numbers and string length
    max?: number; // for numbers and string length
    allowedValues?: any[]; // for enums/limited options
    pattern?: string; // regex pattern for strings
    description?: string; // human-readable description
}

/**
 * Registry of all available settings with their validation rules and defaults
 */
export interface IUserSettingsRegistry {
    [key: string]: {
        defaultValue: any;
        validation?: ISettingValidation;
        category?: string; // for UI grouping
        label?: string; // human-readable label
        description?: string; // human-readable description
    };
}

/**
 * Core settings registry - can be extended easily
 */
export const USER_SETTINGS_REGISTRY: IUserSettingsRegistry = {
    killmailDelay: {
        defaultValue: 0,
        category: "killboard",
        label: "Killmail Delay",
        description: "Delay in hours before showing new killmails",
        validation: {
            type: "number",
            min: 0,
            max: 72,
            required: false,
        },
    },
    defaultCharacterPage: {
        defaultValue: "dashboard",
        category: "navigation",
        label: "Default Character Page",
        description: "Default page to show when viewing characters",
        validation: {
            type: "string",
            allowedValues: [
                "dashboard",
                "kills",
                "losses",
                "combined",
                "battles",
                "corporation-history",
                "top",
                "stats",
                "achievements",
            ],
            required: false,
        },
    },
    defaultCorporationPage: {
        defaultValue: "dashboard",
        category: "navigation",
        label: "Default Corporation Page",
        description: "Default page to show when viewing corporations",
        validation: {
            type: "string",
            allowedValues: [
                "dashboard",
                "kills",
                "losses",
                "combined",
                "battles",
                "corporation-history",
                "top",
                "stats",
                "members",
            ],
            required: false,
        },
    },
    defaultAlliancePage: {
        defaultValue: "dashboard",
        category: "navigation",
        label: "Default Alliance Page",
        description: "Default page to show when viewing alliances",
        validation: {
            type: "string",
            allowedValues: [
                "dashboard",
                "kills",
                "losses",
                "combined",
                "corporationMembers",
                "characterMembers",
                "top",
                "stats",
                "battles",
            ],
            required: false,
        },
    },
    defaultSystemPage: {
        defaultValue: "overview",
        category: "navigation",
        label: "Default System Page",
        description: "Default page to show when viewing systems",
        validation: {
            type: "string",
            allowedValues: ["overview", "kills", "battles"],
            required: false,
        },
    },
    killListAlternatingRows: {
        defaultValue: true,
        category: "ui",
        label: "Alternating Row Colors",
        description: "Show alternating colors in kill lists",
        validation: {
            type: "boolean",
            required: false,
        },
    },
    killListMutedAlternatingRows: {
        defaultValue: false,
        category: "ui",
        label: "Muted Alternating Colors",
        description: "Use muted colors for alternating rows",
        validation: {
            type: "boolean",
            required: false,
        },
    },
};

/**
 * Get all available setting keys
 */
export function getAvailableSettingKeys(): string[] {
    return Object.keys(USER_SETTINGS_REGISTRY);
}

/**
 * Get default value for a setting
 */
export function getSettingDefault(key: string): any {
    return USER_SETTINGS_REGISTRY[key]?.defaultValue;
}

/**
 * Get validation rules for a setting
 */
export function getSettingValidation(
    key: string
): ISettingValidation | undefined {
    return USER_SETTINGS_REGISTRY[key]?.validation;
}

/**
 * Get all default settings as key/value pairs
 */
export function getAllDefaults(): IFlexibleUserSettings {
    const defaults: IFlexibleUserSettings = {};
    for (const [key, config] of Object.entries(USER_SETTINGS_REGISTRY)) {
        defaults[key] = config.defaultValue;
    }
    return defaults;
}

/**
 * Check if a setting key is registered
 */
export function isValidSettingKey(key: string): boolean {
    return key in USER_SETTINGS_REGISTRY;
}
