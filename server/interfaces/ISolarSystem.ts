export interface ISolarSystem {
    region_id: number;
    constellation_id: number;
    system_id: number;
    system_name: string;
    x: number;
    y: number;
    z: number;
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    z_min: number;
    z_max: number;
    luminosity: number;
    border: boolean;
    fringe: boolean;
    corridor: boolean;
    hub: boolean;
    international: boolean;
    regional: boolean;
    constellation: number;
    security: number;
    faction_id: number;
    radius: number;
    sun_type_id: number;
    security_class: string;

    // New fields for tracking activity
    jumps_24h?: IActivityEntry[];
    kills_24h?: IKillsEntry[];

    updatedAt?: Date;
    createdAt?: Date;
}

export interface IActivityEntry {
    timestamp: Date;
    ship_jumps: number;
}

export interface IKillsEntry {
    timestamp: Date;
    ship_kills: number;
    npc_kills: number;
    pod_kills: number;
}
