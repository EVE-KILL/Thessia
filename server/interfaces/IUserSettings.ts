/**
 * Interface for individual user setting items
 */
export interface IUserSetting {
    key: string;
    value: any;
    updatedAt?: Date;
}

/**
 * Available user setting keys with their types
 */
export interface IUserSettingsMap {
    killmailDelay: number;
    defaultCharacterPage: string;
    defaultCorporationPage: string;
    defaultAlliancePage: string;
    defaultSystemPage: string;
    killListAlternatingRows: boolean;
    killListMutedAlternatingRows: boolean;
    // Future settings can be added here
    // emailNotifications: boolean;
    // theme: 'light' | 'dark' | 'auto';
    // language: string;
}

/**
 * Type for setting keys
 */
export type UserSettingKey = keyof IUserSettingsMap;

/**
 * Default values for user settings
 */
export const DEFAULT_USER_SETTINGS: IUserSettingsMap = {
    killmailDelay: 0,
    defaultCharacterPage: "dashboard",
    defaultCorporationPage: "dashboard",
    defaultAlliancePage: "dashboard",
    defaultSystemPage: "overview",
    killListAlternatingRows: true,
    killListMutedAlternatingRows: false,
};

/**
 * Validation rules for user settings
 */
export const USER_SETTING_VALIDATION = {
    killmailDelay: {
        type: "number" as const,
        min: 0,
        max: 72,
        required: false,
    },
    defaultCharacterPage: {
        type: "string" as const,
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
    defaultCorporationPage: {
        type: "string" as const,
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
    defaultAlliancePage: {
        type: "string" as const,
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
    defaultSystemPage: {
        type: "string" as const,
        allowedValues: ["overview", "kills", "battles"],
        required: false,
    },
    killListAlternatingRows: {
        type: "boolean" as const,
        required: false,
    },
    killListMutedAlternatingRows: {
        type: "boolean" as const,
        required: false,
    },
} as const;
