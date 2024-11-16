import { Characters } from "../models/Characters";
//import { Corporations } from "../models/Corporations";
//import { Alliances } from "../models/Alliances";
//import { Factions } from "../models/Factions";
import { Character } from "~/types/ICharacter";
//import { Corporation } from "~/types/ICorporation";
//import { Alliance } from "~/types/IAlliance";

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
                    character = await deletedCharacterInfo(character_id);
                    break;
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
        history: existingCharacter?.history || []
    }
}


async function getCharacterHistory(character_id: Number) {
    let request = await fetch(`https://esi.evetech.net/latest/characters/${character_id}/corporationhistory/?datasource=tranquility`);
    let history = await request.json();

    return history;
}

async function getCorporation(corporation_id: Number) {

}

async function getCorporationHistory(corporation_id: Number) {

}

async function getAlliance(alliance_id: Number) {

}

async function getFaction(faction_id: Number) {

}

export {
    getCharacter,
    getCharacterHistory,
    getCorporation,
    getCorporationHistory,
    getAlliance,
    getFaction
}
