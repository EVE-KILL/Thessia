/**
 * Interface for user configuration items
 */
export interface IConfiguration {
    characterId?: number | null;
    corporationId?: number | null;
    allianceId?: number | null;
    all: boolean;
    key: string;
    value: any;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Input interface for creating/updating configurations
 */
export interface IConfigurationInput {
    characterId?: number | null;
    corporationId?: number | null;
    allianceId?: number | null;
    all?: boolean;
    key: string;
    value: any;
}

/**
 * Priority levels for configuration resolution
 * Lower numbers = higher priority
 */
export enum ConfigurationPriority {
    CHARACTER = 1,
    CORPORATION = 2,
    ALLIANCE = 3,
    ALL = 4,
}

/**
 * Resolved configuration with priority information
 */
export interface IResolvedConfiguration {
    key: string;
    value: any;
    priority: ConfigurationPriority;
    source: {
        characterId?: number | null;
        corporationId?: number | null;
        allianceId?: number | null;
        all: boolean;
    };
}
