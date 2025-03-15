import type { ICorporation } from "../../../interfaces/ICorporation";
import { getAlliance, getCharacter, getCorporation } from "../../../helpers/ESIData";
import { defineEventHandler } from "h3";
import type { IAlliance } from "../../../interfaces/IAlliance";
import { queueUpdateCharacterHistory } from "../../../queue/Character";

export default defineEventHandler(async (event) => {
  const characterId: number | null = event.context.params?.id
    ? Number.parseInt(event.context.params.id)
    : null;
  if (!characterId) {
    return { error: "Character ID not provided" };
  }

  const character = await getCharacter(characterId);
  let history = character.history.reverse() ?? null;
  if (history === null) {
    return { error: "Character history not found" };
  }

  if (history.length === 0) {
    queueUpdateCharacterHistory(characterId, 1);
    return { error: "Character history not found" };
  }

  // Create a map of the history of a character, calculating when the character joined and left a corporation.
  // Each record has a start_date, so we can calculate the end_date by looking at the next record.
  history = history.map((char, index) => {
    const nextRecord = history[index + 1];
    return {
      record_id: char.record_id,
      corporation_id: char.corporation_id,
      start_date: char.start_date,
      end_date: nextRecord ? nextRecord.start_date : null,
    };
  });

  const result = history.map(async (char) => {
    const corporationInfo: ICorporation = await getCorporation(char.corporation_id);
    let allianceInfo: IAlliance | null = null;
    if (corporationInfo?.alliance_id) {
      allianceInfo = await getAlliance(corporationInfo.alliance_id);
    }

    return {
      record_id: char.record_id,
      corporation_id: char.corporation_id,
      corporation_name: corporationInfo.name,
      corporation_ticker: corporationInfo.ticker,
      alliance_id: corporationInfo.alliance_id || 0,
      alliance_name: allianceInfo?.name || "",
      start_date: char.start_date,
      end_date: char.end_date,
    };
  });

  return (await Promise.all(result)).reverse();
});
