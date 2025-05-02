// API endpoint to fetch a single region by region_id

import { Regions } from "~/server/models/Regions";

export default defineEventHandler(async (event) => {
    const id = Number(event.context.params?.id);
    if (!id) {
        return { error: "Missing or invalid region_id" };
    }
    const region = await Regions.findOne({ region_id: id }, { _id: 0, __v: 0 });
    if (!region) {
        return { error: "Region not found" };
    }
    return region;
});
