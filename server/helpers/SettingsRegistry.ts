/**
 * User Settings Registration Helper
 *
 * This utility provides helper functions for dynamically registering new user settings
 * without having to manually edit the registry. Useful for modules/plugins that want
 * to add their own settings.
 */

import type { ISettingValidation } from "../interfaces/IUserSettings";
import { USER_SETTINGS_REGISTRY } from "../interfaces/IUserSettings";

/**
 * Register a new user setting dynamically
 *
 * @param key - The setting key
 * @param config - The setting configuration
 */
export function registerUserSetting(
    key: string,
    config: {
        defaultValue: any;
        validation?: ISettingValidation;
        category?: string;
        label?: string;
        description?: string;
    }
): void {
    if (key in USER_SETTINGS_REGISTRY) {
        console.warn(
            `User setting '${key}' is already registered. Overriding...`
        );
    }

    // Add to the registry
    (USER_SETTINGS_REGISTRY as any)[key] = config;

    console.log(`Registered user setting: ${key}`, config);
}

/**
 * Register multiple user settings at once
 *
 * @param settings - Object with key-value pairs of settings to register
 */
export function registerUserSettings(settings: { [key: string]: any }): void {
    for (const [key, config] of Object.entries(settings)) {
        registerUserSetting(key, config);
    }
}

/**
 * Helper functions for common setting types
 */
export const SettingHelpers = {
    /**
     * Create a boolean setting
     */
    boolean(
        defaultValue: boolean = false,
        label?: string,
        description?: string,
        category = "general"
    ) {
        return {
            defaultValue,
            label,
            description,
            category,
            validation: { type: "boolean" as const, required: false },
        };
    },

    /**
     * Create a string setting with optional allowed values
     */
    string(
        defaultValue: string = "",
        options?: {
            allowedValues?: string[];
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            label?: string;
            description?: string;
            category?: string;
        }
    ) {
        const validation: ISettingValidation = {
            type: "string" as const,
            required: false,
        };

        if (options?.allowedValues)
            validation.allowedValues = options.allowedValues;
        if (options?.minLength !== undefined)
            validation.min = options.minLength;
        if (options?.maxLength !== undefined)
            validation.max = options.maxLength;
        if (options?.pattern) validation.pattern = options.pattern;

        return {
            defaultValue,
            label: options?.label,
            description: options?.description,
            category: options?.category || "general",
            validation,
        };
    },

    /**
     * Create a number setting with optional range
     */
    number(
        defaultValue: number = 0,
        options?: {
            min?: number;
            max?: number;
            label?: string;
            description?: string;
            category?: string;
        }
    ) {
        const validation: ISettingValidation = {
            type: "number" as const,
            required: false,
        };

        if (options?.min !== undefined) validation.min = options.min;
        if (options?.max !== undefined) validation.max = options.max;

        return {
            defaultValue,
            label: options?.label,
            description: options?.description,
            category: options?.category || "general",
            validation,
        };
    },

    /**
     * Create an array setting
     */
    array(
        defaultValue: any[] = [],
        options?: {
            minLength?: number;
            maxLength?: number;
            label?: string;
            description?: string;
            category?: string;
        }
    ) {
        const validation: ISettingValidation = {
            type: "array" as const,
            required: false,
        };

        if (options?.minLength !== undefined)
            validation.min = options.minLength;
        if (options?.maxLength !== undefined)
            validation.max = options.maxLength;

        return {
            defaultValue,
            label: options?.label,
            description: options?.description,
            category: options?.category || "general",
            validation,
        };
    },

    /**
     * Create an object setting
     */
    object(
        defaultValue: object = {},
        options?: {
            label?: string;
            description?: string;
            category?: string;
        }
    ) {
        return {
            defaultValue,
            label: options?.label,
            description: options?.description,
            category: options?.category || "general",
            validation: { type: "object" as const, required: false },
        };
    },
};

/**
 * Example usage:
 *
 * // Register a simple boolean setting
 * registerUserSetting('darkMode', SettingHelpers.boolean(false, 'Dark Mode', 'Use dark theme', 'ui'));
 *
 * // Register a string setting with options
 * registerUserSetting('language', SettingHelpers.string('en', {
 *     allowedValues: ['en', 'es', 'fr', 'de'],
 *     label: 'Language',
 *     description: 'Interface language',
 *     category: 'localization'
 * }));
 *
 * // Register multiple settings at once
 * registerUserSettings({
 *     maxResults: SettingHelpers.number(50, { min: 10, max: 200, label: 'Results Per Page' }),
 *     enableNotifications: SettingHelpers.boolean(true, 'Enable Notifications'),
 *     theme: SettingHelpers.string('auto', { allowedValues: ['light', 'dark', 'auto'] })
 * });
 */
