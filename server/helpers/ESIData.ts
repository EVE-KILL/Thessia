import { Characters } from "../models/Characters";
import { Corporations } from "../models/Corporations";
import { Alliances } from "../models/Alliances";
import { Factions } from "../models/Factions";
import { Character } from "../../types/ICharacter";
import { Corporation } from "../../types/ICorporation";
import { Alliance } from "../../types/IAlliance";
import { Faction } from "../../types/IFaction";

async function getCharacter(character_id: Number): Promise<Character> {
    let character: Character | null = await Characters.findOne(
        { character_id: character_id },
        { _id: 0, __v: 0, createdAt: 0 }
    );

    // If updatedAt is older than 30 days, update the character
    let now = new Date();
    if (character && character.updatedAt) {
        let updatedAt = new Date(character.updatedAt);
        if (now.getTime() - updatedAt.getTime() > (30 * 24 * 60 * 60 * 1000)) {
            character = null;
        } else {
            // Since updatedAt is not older than 30 days, return the character
            delete character.updatedAt;
            return character;
        }
    }

    if (!character) {
        let json = await fetch(`https://esi.evetech.net/latest/characters/${character_id}/?datasource=tranquility`);
        let data = await json.json();

        // Handle errors
        if (data.error) {
            switch(data.error) {
                case 'Character has been deleted!':
                    character = await deletedCharacterInfo(character_id);
                    break;
                case 'Character not found':
                    return { error: 'Character not found' };
                default:
                    throw new Error(data.error);
            }
        }

        // Add character_id to data
        data.character_id = character_id;

        // Get character history
        let history = await getCharacterHistory(character_id);
        data.history = history;

        // Save character to database
        let characterModel = new Characters(data);
        characterModel.save();

        // Return character
        return data;
    }
}

async function deletedCharacterInfo(character_id: Number): Promise<Character> {
    let existingCharacter: Character | null = await Characters.findOne({ character_id: character_id }, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 });
    return {
        character_id: character_id,
        name: existingCharacter?.name || 'Deleted',
        description: existingCharacter?.description || 'This character has been deleted',
        birthday: existingCharacter?.birthday || new Date('2003-01-01 00:00:00'),
        gender: existingCharacter?.gender || 'Unknown',
        race_id: existingCharacter?.race_id || 0,
        security_status: existingCharacter?.security_status || 0,
        bloodline_id: existingCharacter?.bloodline_id || 0,
        corporation_id: existingCharacter?.corporation_id || 0,
        alliance_id: existingCharacter?.alliance_id || 0,
        faction_id: existingCharacter?.faction_id || 0,
        history: existingCharacter?.history || [],
        deleted: true
    }
}

async function getCharacterHistory(character_id: Number): Promise<Object[]> {
    let request = await fetch(`https://esi.evetech.net/latest/characters/${character_id}/corporationhistory/?datasource=tranquility`);
    let history = await request.json();

    return history;
}

async function getCorporation(corporation_id: Number): Promise<Corporation> {
    let corporation: Corporation | null = await Corporations.findOne(
        { corporation_id: corporation_id },
        { _id: 0, __v: 0, createdAt: 0 }
    );

    // If updatedAt is older than 30 days, update the corporation
    let now = new Date();
    if (corporation && corporation.updatedAt) {
        let updatedAt = new Date(corporation.updatedAt);
        if (now.getTime() - updatedAt.getTime() > (30 * 24 * 60 * 60 * 1000)) {
            corporation = null;
        } else {
            // Since updatedAt is not older than 30 days, return the corporation
            delete corporation.updatedAt;
            return corporation;
        }
    }

    if (!corporation) {
        let json = await fetch(`https://esi.evetech.net/latest/corporations/${corporation_id}/?datasource=tranquility`);
        let data = await json.json();

        // Add corporation_id to data
        data.corporation_id = corporation_id;

        // Get corporation history
        let history = await getCorporationHistory(corporation_id);
        data.history = history;

        // Save corporation to database
        let corporationModel = new Corporations(data);
        corporationModel.save();

        // Return corporation
        return data;
    }
}

async function getCorporationHistory(corporation_id: Number): Promise<Object[]> {
    let request = await fetch(`https://esi.evetech.net/latest/corporations/${corporation_id}/alliancehistory/?datasource=tranquility`);
    let history = await request.json();

    return history;
}

async function getAlliance(alliance_id: Number): Promise<Alliance> {
    let alliance: Alliance | null = await Alliances.findOne(
        { alliance_id: alliance_id },
        { _id: 0, __v: 0, createdAt: 0 }
    );

    // If updatedAt is older than 30 days, update the alliance
    let now = new Date();
    if (alliance && alliance.updatedAt) {
        let updatedAt = new Date(alliance.updatedAt);
        if (now.getTime() - updatedAt.getTime() > (30 * 24 * 60 * 60 * 1000)) {
            alliance = null;
        } else {
            // Since updatedAt is not older than 30 days, return the alliance
            return alliance;
        }
    }

    if (!alliance) {
        let json = await fetch(`https://esi.evetech.net/latest/alliances/${alliance_id}/?datasource=tranquility`);
        let data = await json.json();

        // Add alliance_id to data
        data.alliance_id = alliance_id;

        // Save alliance to database
        let allianceModel = new Alliances(data);
        allianceModel.save();

        // Return alliance
        return data;
    }
}

async function getFaction(faction_id: Number): Promise<Faction> | null {
    let faction: Faction | null = await Factions.findOne(
        { faction_id: faction_id },
        { _id: 0, __v: 0, createdAt: 0 }
    );

    // Factions don't have a history, and can't be fetched from ESI, so if it doesn't exist in the database, return null
    return faction;
}

export {
    getCharacter,
    getCharacterHistory,
    getCorporation,
    getCorporationHistory,
    getAlliance,
    getFaction
}
