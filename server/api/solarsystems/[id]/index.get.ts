// API endpoint to fetch a single solar system by system_id or system_name

import { createError } from 'h3';
import { SolarSystems } from "~/server/models/SolarSystems";

export default defineEventHandler(async (event) => {
    const param = event.context.params?.id;

    if (!param) {
        throw createError({ statusCode: 400, statusMessage: "Missing system identifier" });
    }

    let system;
    const numericId = Number(param);

    if (!isNaN(numericId) && param.match(/^\d+$/)) { // Check if it's a valid number (integer)
        system = await SolarSystems.findOne({ system_id: numericId }, { _id: 0, __v: 0 });
        if (!system) {
            throw createError({ statusCode: 404, statusMessage: `Solar system with ID ${numericId} not found` });
        }
    } else { // Treat as a system name
        // Perform a case-insensitive search for the system name
        const nameRegex = new RegExp(`^${param}$`, 'i');
        system = await SolarSystems.findOne({ system_name: nameRegex }, { _id: 0, __v: 0 });
        if (!system) {
            throw createError({ statusCode: 404, statusMessage: `Solar system with name "${param}" not found` });
        }
    }

    return system;
});
