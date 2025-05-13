import { type ITranslation } from '~/server/interfaces/ITranslation';

/**
 * Interface representing the output of campaign statistics from the CampaignHelper.
 */
export interface ICampaignOutput {
    // Campaign metadata
    name: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
    creator_id?: number;

    // Campaign statistics
    totalKills: number;
    totalLosses: number;
    iskDamageDoneAttacker: number;
    iskDamageDoneVictim: number;
    iskDamageReceivedAttacker: number;
    iskDamageReceivedVictim: number;
    runtimeDays: number;
    efficiency: number;
    attackerVsVictim: boolean;
    shipGroupStats: Array<{
        ship_group_id: number;
        ship_group_name: string | ITranslation;
        killed: number;
        lost: number;
    }>;
    topKillersByCharacter: Array<{
        character_id: number;
        character_name: string;
        kills: number;
    }>;
    topDamageDealersByCharacter: Array<{
        character_id: number;
        character_name: string;
        damageDone: number;
    }>;
    killmailIds: number[];
}
