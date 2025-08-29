/**
 * Helper class for managing user settings
 */
export class UserSettingsHelper {
    private user: IUserDocument;

    constructor(user: IUserDocument) {
        this.user = user;
    }

    /**
     * Get a specific setting value with fallback to default
     */
    getSetting<K extends UserSettingKey>(key: K): IUserSettingsMap[K] {
        const setting = this.user.settings.find((s) => s.key === key);
        return setting ? setting.value : DEFAULT_USER_SETTINGS[key];
    }

    /**
     * Get all settings as a typed object
     */
    getAllSettings(): IUserSettingsMap {
        const result = { ...DEFAULT_USER_SETTINGS };

        for (const setting of this.user.settings) {
            if (setting.key in DEFAULT_USER_SETTINGS) {
                (result as any)[setting.key] = setting.value;
            }
        }

        return result;
    }

    /**
     * Set a specific setting value with validation
     */
    async setSetting<K extends UserSettingKey>(
        key: K,
        value: IUserSettingsMap[K]
    ): Promise<boolean> {
        // Validate the setting value
        if (!this.validateSetting(key, value)) {
            throw new Error(`Invalid value for setting '${key}': ${value}`);
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
    async setSettings(settings: Partial<IUserSettingsMap>): Promise<boolean> {
        for (const [key, value] of Object.entries(settings)) {
            if (key in DEFAULT_USER_SETTINGS) {
                if (!this.validateSetting(key as UserSettingKey, value)) {
                    throw new Error(
                        `Invalid value for setting '${key}': ${value}`
                    );
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
        }

        await this.user.save();
        return true;
    }

    /**
     * Remove a specific setting (will revert to default)
     */
    async removeSetting(key: UserSettingKey): Promise<boolean> {
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
    private validateSetting(key: UserSettingKey, value: any): boolean {
        const validation = USER_SETTING_VALIDATION[key];
        if (!validation) return true;

        // Type checking based on the setting key
        if (key === "killmailDelay") {
            if (typeof value !== "number") return false;
            if ("min" in validation && value < validation.min) return false;
            if ("max" in validation && value > validation.max) return false;
        } else if (
            key === "defaultCharacterPage" ||
            key === "defaultCorporationPage" ||
            key === "defaultAlliancePage" ||
            key === "defaultSystemPage"
        ) {
            if (typeof value !== "string") return false;
            if (
                "allowedValues" in validation &&
                !validation.allowedValues.includes(value as any)
            )
                return false;
        } else if (
            key === "killListAlternatingRows" ||
            key === "killListMutedAlternatingRows"
        ) {
            if (typeof value !== "boolean") return false;
        }

        return true;
    }

    /**
     * Static helper to get user settings for a character ID
     */
    static async getSettingsForCharacter(
        characterId: number
    ): Promise<IUserSettingsMap | null> {
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
        settings: Partial<IUserSettingsMap>
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
