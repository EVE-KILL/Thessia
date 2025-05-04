export interface IBattles {
    battle_id: number;
    start_time: Date;
    end_time: Date;
    system_id: number;
    killmailsCount: number;
    iskDestroyed: number;
    alliancesInvolved: number[];
    corporationsInvolved: number[];
    charactersInvolved: number[];
    blue_team: {
        alliances: Array<{
            id: number;
            name: string;
        }>;
        corporations: Array<{
            id: number;
            name: string;
        }>;
    };
    red_team: {
        alliances: Array<{
            id: number;
            name: string;
        }>;
        corporations: Array<{
            id: number;
            name: string;
        }>;
    };
    updatedAt?: Date;
    createdAt?: Date;
}
