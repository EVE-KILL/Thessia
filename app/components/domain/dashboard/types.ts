export interface DomainDashboardComponentProps {
    /** Domain identifier */
    domain?: string;
    /** Time range for data filtering */
    timeRange?: "1d" | "7d" | "14d" | "30d" | "90d";
    /** Entity filter */
    entityFilter?: {
        type: "character" | "corporation" | "alliance";
        id: number;
    };
    /** Custom data override (bypasses API calls) */
    data?: any;
    /** Loading state override */
    loading?: boolean;
    /** Custom CSS class */
    customClass?: string;
    /** Custom inline styles */
    customStyles?: Record<string, any>;
}

export interface DomainDashboardStats {
    /** Most valuable killmails */
    mostValuableKills: any[];
    /** Top killers by character */
    topKillersByCharacter: any[];
    /** Top killers by corporation */
    topKillersByCorporation: any[];
    /** Top killers by alliance */
    topKillersByAlliance: any[];
    /** Ship statistics */
    shipStats: {
        destroyed: any[];
    };
    /** Ship group statistics */
    shipGroupStats: any[];
    /** Top ships (for component compatibility) */
    topShips: any[];
    /** Total kill count */
    totalKills: number;
    /** Total ISK value */
    totalValue: number;
    /** Active entity counts */
    activeCharacters: number;
    activeCorporations: number;
    activeAlliances: number;
    /** Domain metadata */
    domain_info?: {
        domain: string;
        entity_count: number;
        time_range: string;
        entity_filter: string | null;
        primary_entity: any;
    };
}

export interface DomainEntity {
    entity_id: string | number;
    entity_type: "character" | "corporation" | "alliance";
    name: string;
    display_name: string;
    image_url?: string;
    primary?: boolean;
    show_in_nav?: boolean;
    show_in_stats?: boolean;
    missing?: boolean;
}

export interface EntityStats {
    [entity_id: string]: {
        kills: number;
        value: number;
        recent_activity: boolean;
    };
}
