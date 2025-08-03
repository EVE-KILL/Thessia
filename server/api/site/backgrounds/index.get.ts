import fs from "node:fs";
import path from "node:path";

/**
 * API endpoint to get all available background images
 *
 * @returns Array of background image objects
 */

export default defineCachedEventHandler(
    async (event) => {
        const theme = process.env.THEME || "modern";
        // Path to the public backgrounds directory
        const dirs = [
            path.join(
                process.cwd(),
                "src",
                "theme",
                theme,
                "public",
                "backgrounds"
            ),
            path.join(process.cwd(), "public", "backgrounds"),
        ];

        // Find the first directory that exists
        let existingDir = null;
        for (const dir of dirs) {
            try {
                const stats = await fs.promises.stat(dir);
                if (stats.isDirectory()) {
                    existingDir = dir;
                    break;
                }
            } catch (error) {
                // Directory doesn't exist, try next one
                continue;
            }
        }

        // If no directory exists, return empty array
        if (!existingDir) {
            return [];
        }

        try {
            // Read the directory
            const files = await fs.promises.readdir(existingDir);

            // Check if thumbs directory exists
            const thumbsDir = path.join(existingDir, "thumbs");
            let thumbsExist = false;
            try {
                const thumbsStats = await fs.promises.stat(thumbsDir);
                thumbsExist = thumbsStats.isDirectory();
            } catch (error) {
                // thumbs directory doesn't exist
            }

            // Filter for image files and format the response
            const backgrounds = files
                .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
                .map((file) => {
                    const baseName = path.parse(file).name;
                    const ext = path.parse(file).ext;
                    return {
                        path: `/backgrounds/${file}`,
                        thumbnail: thumbsExist
                            ? `/backgrounds/thumbs/${file}`
                            : `/backgrounds/${file}`,
                        name: baseName,
                    };
                });

            return backgrounds;
        } catch (error) {
            console.error("Error reading backgrounds directory:", error);
            return [];
        }
    },
    {
        maxAge: 86400, // Using a maxAge of 86400 seconds for static backgrounds
        staleMaxAge: -1,
        swr: true,
        base: "redis", // Assuming redis is the default cache base
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            // This endpoint does not use query parameters, so a static key is sufficient.
            return `site:backgrounds:index`;
        },
    }
);
