// API endpoint to fetch a single region by region_id or name

import { Regions } from "~/server/models/Regions";
import { createError } from 'h3';

export default defineEventHandler(async (event) => {
    const param = event.context.params?.id;

    if (!param) {
        throw createError({ statusCode: 400, statusMessage: "Missing region identifier" });
    }

    let region;
    const numericId = Number(param);

    // Check if param is a string of digits
    if (!isNaN(numericId) && param.match(/^\d+$/)) {
        region = await Regions.findOne({ region_id: numericId }, { _id: 0, __v: 0 });
        if (!region) {
            throw createError({ statusCode: 404, statusMessage: `Region with ID ${numericId} not found` });
        }
    } else { // Treat as a region name
        // Perform a case-insensitive search for the name
        const nameRegex = new RegExp(`^${param}$`, 'i');
        // Assuming the field for region name is 'name' in your model
        region = await Regions.findOne({ "name.en": nameRegex }, { _id: 0, __v: 0 });
        if (!region) {
            throw createError({ statusCode: 404, statusMessage: `Region with name "${param}" not found` });
        }
    }

    return region;
});
