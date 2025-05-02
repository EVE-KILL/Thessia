// API endpoint to fetch a single constellation by constellation_id

import { Constellations } from "~/server/models/Constellations";

export default defineEventHandler(async (event) => {
    const id = Number(event.context.params?.id);
    if (!id) {
        return { error: "Missing or invalid constellation_id" };
    }
    const constellation = await Constellations.findOne({ constellation_id: id }, { _id: 0, __v: 0 });
    if (!constellation) {
        return { error: "Constellation not found" };
    }
    return constellation;
});
