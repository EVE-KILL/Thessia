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
} as const;
