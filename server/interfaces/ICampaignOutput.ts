import { type ITranslation } from "~/server/interfaces/ITranslation";
import { ICampaign } from "./ICampaign";

/**
 * Interface representing processed filter entities for the campaign UI
 */
export interface ICampaignFilterEntities {
    regions: Array<{ id: number; name: string }>;
    constellations: Array<{ id: number; name: string }>;
    systems: Array<{ id: number; name: string }>;
    attackerCharacters: Array<{ id: number; name: string }>;
    attackerCorporations: Array<{ id: number; name: string }>;
    attackerAlliances: Array<{ id: number; name: string }>;
    attackerFactions: Array<{ id: number; name: string }>;
    victimCharacters: Array<{ id: number; name: string }>;
    victimCorporations: Array<{ id: number; name: string }>;
    victimAlliances: Array<{ id: number; name: string }>;
    victimFactions: Array<{ id: number; name: string }>;
}

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
    campaignQuery: ICampaign["query"];

    // Pre-processed filter data for UI display
    filterEntities: ICampaignFilterEntities;

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

    // Character statistics - now separated by role
    topKillersByCharacter: Array<{
        character_id: number;
        character_name: string;
        kills: number;
    }>;
    topVictimsByCharacter: Array<{
        character_id: number;
        character_name: string;
        losses: number;
    }>;
    topDamageDealersByCharacter: Array<{
        character_id: number;
        character_name: string;
        damageDone: number;
    }>;
    topDamageTakersByCharacter: Array<{
        character_id: number;
        character_name: string;
        damageTaken: number;
    }>;

    // Corporation statistics
    topKillersByCorporation: Array<{
        corporation_id: number;
        corporation_name: string;
        kills: number;
    }>;
    topVictimsByCorporation: Array<{
        corporation_id: number;
        corporation_name: string;
        losses: number;
    }>;

    // Alliance statistics
    topKillersByAlliance: Array<{
        alliance_id: number;
        alliance_name: string;
        kills: number;
    }>;
    topVictimsByAlliance: Array<{
        alliance_id: number;
        alliance_name: string;
        losses: number;
    }>;

    // Most valuable kills/losses
    mostValuableKills: Array<{
        killmail_id: number;
        total_value: number;
        victim: {
            ship_id: number;
            ship_name: string | ITranslation;
            character_id?: number;
            character_name?: string;
            corporation_id?: number;
            corporation_name?: string;
            alliance_id?: number;
            alliance_name?: string;
        };
        final_blow?: {
            character_id?: number;
            character_name?: string;
            ship_id: number;
            ship_name: string | ITranslation;
        };
    }>;

    killmailIds: number[];
}
