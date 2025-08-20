/**
 * Composable for getting EVE Online image URLs
 * Provides consistent image URLs for characters, corporations, alliances, and other EVE assets
 */
export function useEveImages() {
    /**
     * Valid image sizes for EVE's image server
     * Only 32, 64, 128, 256, 512, or 1024 are supported
     */
    const VALID_SIZES = [32, 64, 128, 256, 512, 1024];

    /**
     * Normalize size to the nearest valid EVE image size
     * @param size - Requested image size
     * @returns Nearest valid size (32, 64, 128, 256, 512, or 1024)
     */
    const normalizeSize = (size: number): number => {
        // If the size is already valid, return it
        if (VALID_SIZES.includes(size)) return size;

        // Otherwise find the nearest valid size
        return VALID_SIZES.reduce((prev, curr) => {
            return Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev;
        });
    };

    /**
     * Get character portrait URL
     * @param characterId - EVE character ID
     * @param size - Image size (default: 128, will be normalized to nearest valid size)
     * @returns Character portrait URL
     */
    const getCharacterPortrait = (
        characterId: number | null,
        size = 128
    ): string | null => {
        if (!characterId) return null;
        const validSize = normalizeSize(size);
        return `https://images.eve-kill.com/characters/${characterId}/portrait?size=${validSize}`;
    };

    /**
     * Get corporation logo URL
     * @param corporationId - EVE corporation ID
     * @param size - Image size (default: 64, will be normalized to nearest valid size)
     * @returns Corporation logo URL
     */
    const getCorporationLogo = (
        corporationId: number | null,
        size = 64
    ): string | null => {
        if (!corporationId) return null;
        const validSize = normalizeSize(size);
        return `https://images.eve-kill.com/corporations/${corporationId}/logo?size=${validSize}`;
    };

    /**
     * Get alliance logo URL
     * @param allianceId - EVE alliance ID
     * @param size - Image size (default: 64, will be normalized to nearest valid size)
     * @returns Alliance logo URL
     */
    const getAllianceLogo = (
        allianceId: number | null,
        size = 64
    ): string | null => {
        if (!allianceId) return null;
        const validSize = normalizeSize(size);
        return `https://images.eve-kill.com/alliances/${allianceId}/logo?size=${validSize}`;
    };

    /**
     * Get type icon URL (for items, ships, etc.)
     * @param typeId - EVE type ID
     * @param size - Image size (default: 64, will be normalized to nearest valid size)
     * @returns Type icon URL
     */
    const getTypeIcon = (typeId: number | null, size = 64): string | null => {
        if (!typeId) return null;
        const validSize = normalizeSize(size);
        return `https://images.eve-kill.com/types/${typeId}/icon?size=${validSize}`;
    };

    /**
     * Get type render URL (3D rendering)
     * @param typeId - EVE type ID
     * @param size - Image size (default: 512, will be normalized to nearest valid size)
     * @returns Type render URL
     */
    const getTypeRender = (
        typeId: number | null,
        size = 512
    ): string | null => {
        if (!typeId) return null;
        const validSize = normalizeSize(size);
        return `https://images.eve-kill.com/types/${typeId}/render?size=${validSize}`;
    };

    /**
     * Get blueprint icon URL
     * @param typeId - EVE type ID
     * @param size - Image size (default: 64, will be normalized to nearest valid size)
     * @returns Blueprint icon URL
     */
    const getBlueprintIcon = (
        typeId: number | null,
        size = 64
    ): string | null => {
        if (!typeId) return null;
        const validSize = normalizeSize(size);
        return `https://images.eve-kill.com/types/${typeId}/bp?size=${validSize}`;
    };

    /**
     * Get blueprint copy icon URL
     * @param typeId - EVE type ID
     * @param size - Image size (default: 64, will be normalized to nearest valid size)
     * @returns Blueprint copy icon URL
     */
    const getBlueprintCopyIcon = (
        typeId: number | null,
        size = 64
    ): string | null => {
        if (!typeId) return null;
        const validSize = normalizeSize(size);
        return `https://images.eve-kill.com/types/${typeId}/bpc?size=${validSize}`;
    };

    /**
     * Get system image URL
     * @param systemId - EVE solar system ID
     * @param size - Image size (default: 64, will be normalized to nearest valid size)
     * @returns System image URL
     */
    const getSystemImage = (
        systemId: number | null,
        size = 64
    ): string | null => {
        if (!systemId) return null;
        const validSize = normalizeSize(size);
        return `https://images.eve-kill.com/systems/${systemId}?size=${validSize}`;
    };

    /**
     * Get constellation image URL
     * @param constellationId - EVE constellation ID
     * @param size - Image size (default: 64, will be normalized to nearest valid size)
     * @returns Constellation image URL
     */
    const getConstellationImage = (
        constellationId: number | null,
        size = 64
    ): string | null => {
        if (!constellationId) return null;
        const validSize = normalizeSize(size);
        return `https://images.eve-kill.com/constellations/${constellationId}?size=${validSize}`;
    };

    /**
     * Get region image URL
     * @param regionId - EVE region ID
     * @param size - Image size (default: 64, will be normalized to nearest valid size)
     * @returns Region image URL
     */
    const getRegionImage = (
        regionId: number | null,
        size = 64
    ): string | null => {
        if (!regionId) return null;
        const validSize = normalizeSize(size);
        return `https://images.eve-kill.com/regions/${regionId}?size=${validSize}`;
    };

    /**
     * Check if an item name represents a blueprint
     * @param name - Item name to check
     * @returns True if the name indicates a blueprint
     */
    const isBlueprint = (name: string | null | undefined): boolean => {
        if (!name) return false;
        return name.includes("Blueprint");
    };

    /**
     * Check if an item name represents a blueprint copy
     * @param name - Item name to check
     * @returns True if the name indicates a blueprint copy
     */
    const isBlueprintCopy = (name: string | null | undefined): boolean => {
        if (!name) return false;
        return name.includes("Blueprint Copy");
    };

    /**
     * Get appropriate image URL based on item type and name
     * @param typeId - EVE type ID
     * @param name - Item name (used to detect if it's a blueprint)
     * @param imageType - Requested image type (icon, render)
     * @param size - Image size
     * @returns URL for the appropriate image type
     */
    const getItemImageUrl = (
        typeId: number | null,
        name: string | null | undefined,
        imageType = "icon",
        size = 64
    ): string | null => {
        if (!typeId) return null;

        // Determine the correct image type based on the name
        if (isBlueprintCopy(name)) {
            return getBlueprintCopyIcon(typeId, size);
        }
        if (isBlueprint(name)) {
            return getBlueprintIcon(typeId, size);
        }
        if (imageType === "render") {
            return getTypeRender(typeId, size);
        }
        return getTypeIcon(typeId, size);
    };

    return {
        VALID_SIZES,
        normalizeSize,
        getCharacterPortrait,
        getCorporationLogo,
        getAllianceLogo,
        getTypeIcon,
        getTypeRender,
        getBlueprintIcon,
        getBlueprintCopyIcon,
        getSystemImage,
        getConstellationImage,
        getRegionImage,
        isBlueprint,
        isBlueprintCopy,
        getItemImageUrl,
    };
}
