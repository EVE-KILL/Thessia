import { createHash } from "crypto";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        if (!body.dscan || typeof body.dscan !== "string") {
            return { error: "No valid DScan data provided" };
        }

        // Parse DScan data from the string
        const lines = body.dscan.split("\n");
        const ships: Record<string, number> = {};

        for (const line of lines) {
            if (!line.trim()) continue;

            const fields = line.includes("\t")
                ? line.split("\t")
                : line.split("    ");
            if (fields.length < 3) continue;

            const shipType = fields[2].trim();
            if (shipType) {
                ships[shipType] = (ships[shipType] || 0) + 1;
            }
        }

        const returnData = { ships };
        const hash = createHash("sha256")
            .update(JSON.stringify(returnData))
            .digest("hex");
        returnData["hash"] = hash;

        // Save to database
        await DScan.findOneAndUpdate({ hash }, returnData, {
            upsert: true,
            new: true,
        });

        return returnData;
    } catch (error) {
        console.error("Error processing DScan:", error);
        throw createError({
            statusCode: 500,
            message: "Failed to process DScan data",
        });
    }
});
