import type { IFlexibleUserSettings } from "../interfaces/IUserSettings";
import {
    getAllDefaults,
    getSettingDefault,
    getSettingValidation,
    isValidSettingKey,
} from "../interfaces/IUserSettings";

/**
 * Helper class for managing user settings with flexible key/value system
 */
export class UserSettingsHelper {
    private user: IUserDocument;

    constructor(user: IUserDocument) {
        this.user = user;
    }

    /**
     * Get a specific setting value with fallback to default
     */
    getSetting(key: string): any {
        const setting = this.user.settings.find((s) => s.key === key);
        if (setting !== undefined) {
            return setting.value;
        }

        // Return registered default or null if not registered
        return getSettingDefault(key) ?? null;
    }

    /**
     * Get all settings as a key/value object
     */
    getAllSettings(): IFlexibleUserSettings {
        const result: IFlexibleUserSettings = {};

        // Start with all registered defaults
        const defaults = getAllDefaults();
        for (const [key, defaultValue] of Object.entries(defaults)) {
            result[key] = defaultValue;
        }

        // Override with user's actual settings
        for (const setting of this.user.settings) {
            // Only include registered settings
            if (isValidSettingKey(setting.key)) {
                result[setting.key] = setting.value;
            }
        }

        return result;
    }

    /**
     * Set a specific setting value with validation
     */
    async setSetting(key: string, value: any): Promise<boolean> {
        // Check if setting is registered
        if (!isValidSettingKey(key)) {
            throw new Error(
                `Unknown setting key: '${key}'. Register it in USER_SETTINGS_REGISTRY first.`
            );
        }

        // Validate the setting value
        if (!this.validateSetting(key, value)) {
            const validation = getSettingValidation(key);
            throw new Error(
                `Invalid value for setting '${key}': ${value}. Expected ${
                    validation?.type || "any"
                }`
            );
        }

        // Find existing setting or create new one
        const existingIndex = this.user.settings.findIndex(
            (s) => s.key === key
        );

        if (existingIndex >= 0) {
            // Update existing setting
            this.user.settings[existingIndex].value = value;
            this.user.settings[existingIndex].updatedAt = new Date();
        } else {
            // Add new setting
            this.user.settings.push({
                key,
                value,
                updatedAt: new Date(),
            });
        }

        // Save to database
        await this.user.save();
        return true;
    }

    /**
     * Set multiple settings at once
     */
    async setSettings(settings: IFlexibleUserSettings): Promise<boolean> {
        for (const [key, value] of Object.entries(settings)) {
            if (!isValidSettingKey(key)) {
                console.warn(`Skipping unknown setting key: ${key}`);
                continue;
            }

            if (!this.validateSetting(key, value)) {
                throw new Error(`Invalid value for setting '${key}': ${value}`);
            }

            const existingIndex = this.user.settings.findIndex(
                (s) => s.key === key
            );

            if (existingIndex >= 0) {
                this.user.settings[existingIndex].value = value;
                this.user.settings[existingIndex].updatedAt = new Date();
            } else {
                this.user.settings.push({
                    key,
                    value,
                    updatedAt: new Date(),
                });
            }
        }

        await this.user.save();
        return true;
    }

    /**
     * Remove a specific setting (will revert to default)
     */
    async removeSetting(key: string): Promise<boolean> {
        const index = this.user.settings.findIndex((s) => s.key === key);
        if (index >= 0) {
            this.user.settings.splice(index, 1);
            await this.user.save();
            return true;
        }
        return false;
    }

    /**
     * Validate a setting value against its validation rules
     */
    private validateSetting(key: string, value: any): boolean {
        const validation = getSettingValidation(key);
        if (!validation) return true;

        // Type validation
        switch (validation.type) {
            case "string":
                if (typeof value !== "string") return false;
                if (
                    validation.min !== undefined &&
                    value.length < validation.min
                )
                    return false;
                if (
                    validation.max !== undefined &&
                    value.length > validation.max
                )
                    return false;
                if (validation.pattern) {
                    const regex = new RegExp(validation.pattern);
                    if (!regex.test(value)) return false;
                }
                break;

            case "number":
                if (typeof value !== "number") return false;
                if (validation.min !== undefined && value < validation.min)
                    return false;
                if (validation.max !== undefined && value > validation.max)
                    return false;
                break;

            case "boolean":
                if (typeof value !== "boolean") return false;
                break;

            case "array":
                if (!Array.isArray(value)) return false;
                if (
                    validation.min !== undefined &&
                    value.length < validation.min
                )
                    return false;
                if (
                    validation.max !== undefined &&
                    value.length > validation.max
                )
                    return false;
                break;

            case "object":
                if (
                    typeof value !== "object" ||
                    value === null ||
                    Array.isArray(value)
                )
                    return false;
                break;

            default:
                // Unknown type, allow any value
                break;
        }

        // Allowed values validation (for enums/limited options)
        if (
            validation.allowedValues &&
            !validation.allowedValues.includes(value)
        ) {
            return false;
        }

        return true;
    }

    /**
     * Static helper to get user settings for a character ID
     */
    static async getSettingsForCharacter(
        characterId: number
    ): Promise<IFlexibleUserSettings | null> {
        const user = await Users.findOne({ characterId });
        if (!user) return null;

        const helper = new UserSettingsHelper(user);
        return helper.getAllSettings();
    }

    /**
     * Static helper to update settings for a character ID
     */
    static async updateSettingsForCharacter(
        characterId: number,
        settings: IFlexibleUserSettings
    ): Promise<boolean> {
        const user = await Users.findOne({ characterId });
        if (!user) return false;

        const helper = new UserSettingsHelper(user);
        return await helper.setSettings(settings);
    }
}

/**
 * Convenience function to get a UserSettingsHelper instance
 */
export function getUserSettingsHelper(user: IUserDocument): UserSettingsHelper {
    return new UserSettingsHelper(user);
}
