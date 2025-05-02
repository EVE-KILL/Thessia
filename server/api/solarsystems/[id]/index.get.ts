// API endpoint to fetch a single solar system by system_id

import { SolarSystems } from "~/server/models/SolarSystems";

export default defineEventHandler(async (event) => {
    const id = Number(event.context.params?.id);
    if (!id) {
        return { error: "Missing or invalid system_id" };
    }
    const system = await SolarSystems.findOne({ system_id: id }, { _id: 0, __v: 0 });
    if (!system) {
        return { error: "Solar system not found" };
    }
    return system;
});
