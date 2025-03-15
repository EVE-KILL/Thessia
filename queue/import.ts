import type { Job } from "bullmq";
import { createWorker } from "../server/helpers/Queue";
import { Alliances } from "../server/models/Alliances";
import { Characters } from "../server/models/Characters";
import { Corporations } from "../server/models/Corporations";

export default {
  name: "import",
  description: "Imports entities from the importData console job",
  run: () => {
    createWorker(
      "importCharacter",
      async (job: Job) => {
        const character = job.data.character;
        const characterData = new Characters({
          character_id: character.character_id,
          name: character.name,
          description: character.description,
          birthday: character.birthday,
          gender: character.gender,
          race_id: character.race_id,
          security_status: character.security_status,
          bloodline_id: character.bloodline_id,
          corporation_id: character.corporation_id,
          alliance_id: character.alliance_id || 0,
          faction_id: character.faction_id || 0,
          history: character.history || [],
          deleted: character.deleted || false,
        });

        try {
          await characterData.save();
        } catch (err) {
          await characterData.updateOne(
            { character_id: character.character_id },
            {
              name: character.name,
              description: character.description,
              birthday: character.birthday,
              gender: character.gender,
              race_id: character.race_id,
              security_status: character.security_status,
              bloodline_id: character.bloodline_id,
              corporation_id: character.corporation_id,
              alliance_id: character.alliance_id || 0,
              faction_id: character.faction_id || 0,
              history: character.history || [],
              deleted: character.deleted || false,
            },
          );
        }
      },
      {
        concurrency: 5,
      },
    )
      .on("failed", (job: Job | undefined, err: Error) => {
        console.log(
          "Character Update:",
          job?.id,
          "( CharacterID:",
          job.data.character.character_id,
          `) | ${err.message} | ${process.env.ESI_URL || "https://esi.evetech.net/"}latest/characters/${job?.data.characterId}/`,
        );
      })
      .on("completed", (job: Job) => {
        console.log(
          "Character Update:",
          job.id,
          "( CharacterID:",
          job.data.character.character_id,
          ") | Completed",
        );
      })
      .on("ready", () => {
        console.log("Character Worker Ready");
      });

    createWorker(
      "importCorporation",
      async (job: Job) => {
        const corporation = job.data.corporation;
        const corporationData = new Corporations({
          corporation_id: corporation.id,
          name: corporation.name,
          ticker: corporation.ticker,
          date_founded: new Date(corporation.date_founded),
          creator_id: corporation.creator_character_id || 0,
          ceo_id: corporation.ceo_character_id || 0,
          member_count: corporation.member_count,
        });

        try {
          await corporationData.save();
        } catch (err) {
          await corporationData.updateOne(
            { corporation_id: corporation.id },
            {
              corporation_id: corporation.id,
              name: corporation.name,
              ticker: corporation.ticker,
              date_founded: new Date(corporation.date_founded),
              creator_id: corporation.creator_character_id || 0,
              ceo_id: corporation.ceo_character_id || 0,
              member_count: corporation.member_count,
            },
          );
        }
      },
      {
        concurrency: 5,
      },
    )
      .on("failed", (job: Job | undefined, err: Error) => {
        console.log(
          "Corporation Update:",
          job?.id,
          "( CorporationID:",
          job.data.corporation.corporation_id,
          `) | ${err.message} | ${process.env.ESI_URL || "https://esi.evetech.net/"}latest/corporations/${job?.data.corporationId}/`,
        );
      })
      .on("completed", (job: Job) => {
        console.log(
          "Corporation Update:",
          job.id,
          "( CorporationID:",
          job.data.corporation.corporation_id,
          ") | Completed",
        );
      })
      .on("ready", () => {
        console.log("Corporation Worker Ready");
      });

    createWorker(
      "importAlliance",
      async (job: Job) => {
        const alliance = job.data.alliance;
        const allianceData = new Alliances({
          alliance_id: alliance.id,
          name: alliance.name,
          ticker: alliance.ticker,
          executor_corporation_id: alliance.executor_corporation_id || 0,
          creator_id: alliance.creator_character_id || 0,
          date_founded: new Date(alliance.date_founded),
        });

        try {
          await allianceData.save();
        } catch (err) {
          await allianceData.updateOne(
            { alliance_id: alliance.id },
            {
              name: alliance.name,
              ticker: alliance.ticker,
              executor_corporation_id: alliance.executor_corporation_id || 0,
              creator_id: alliance.creator_character_id || 0,
              date_founded: new Date(alliance.date_founded),
            },
          );
        }
      },
      {
        concurrency: 5,
      },
    )
      .on("failed", (job: Job | undefined, err: Error) => {
        console.log(
          "Alliance Update:",
          job?.id,
          "( AllianceID:",
          job.data.alliance.alliance_id,
          `) | ${err.message} | ${process.env.ESI_URL || "https://esi.evetech.net/"}latest/alliances/${job?.data.allianceId}/`,
        );
      })
      .on("completed", (job: Job) => {
        console.log(
          "Alliance Update:",
          job.id,
          "( AllianceID:",
          job.data.alliance.alliance_id,
          ") | Completed",
        );
      })
      .on("ready", () => {
        console.log("Alliance Worker Ready");
      });
  },
};
