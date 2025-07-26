/**
 * Helper functions for achievement translations
 * Handles both static and dynamically generated achievement translations
 */

/**
 * Gets the translated name for an achievement
 * Falls back to the original name if no translation is found
 */
export function getAchievementName(
    achievementId: string,
    originalName: string,
    t: (key: string, fallback?: string) => string
): string {
    return t(`achievements.names.${achievementId}`, originalName);
}

/**
 * Gets the translated description for an achievement
 * Falls back to the original description if no translation is found
 */
export function getAchievementDescription(
    achievementId: string,
    originalDescription: string,
    t: (key: string, fallback?: string) => string
): string {
    return t(`achievements.descriptions.${achievementId}`, originalDescription);
}

/**
 * Generates translation keys for dynamically created ship-type achievements
 * This can be used to help generate i18n entries for ship group achievements
 */
export function generateShipAchievementTranslations(
    shipGroups: Array<{ group_id: number; name: { en: string } }>
) {
    const translations = {
        names: {} as Record<string, string>,
        descriptions: {} as Record<string, string>,
    };

    for (const group of shipGroups) {
        if (!group.name?.en) continue;

        const groupName = group.name.en;
        const article = groupName.match(/^[aeiou]/i) ? "an" : "a";

        // Kill achievement
        const killId = `kill_${group.group_id}`;
        translations.names[killId] = `Kill ${article} ${groupName}`;
        translations.descriptions[
            killId
        ] = `Kill ${article} ${groupName} in combat.`;

        // Loss achievement
        const lossId = `lose_${group.group_id}`;
        translations.names[lossId] = `Lose ${article} ${groupName}`;
        translations.descriptions[
            lossId
        ] = `Lose ${article} ${groupName} in combat.`;
    }

    return translations;
}

/**
 * Helper to check if an achievement has a translation available
 */
export function hasAchievementTranslation(
    achievementId: string,
    type: "name" | "description",
    t: (key: string) => string
): boolean {
    try {
        const key = `achievements.${
            type === "name" ? "names" : "descriptions"
        }.${achievementId}`;
        const result = t(key);
        // If the translation returns the key itself, it means no translation was found
        return result !== key;
    } catch {
        return false;
    }
}
