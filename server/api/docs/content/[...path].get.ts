import { promises as fs } from "fs";
import { dirname, join, normalize, resolve } from "path";
import { fileURLToPath } from "url";

/**
 * Get the documentation directory path based on environment
 */
async function getDocsDirectory(): Promise<string | null> {
    // In development, read from the source docs directory
    if (process.env.NODE_ENV === "development") {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);

        const possiblePaths = [
            resolve(process.cwd(), "docs"),
            resolve(__dirname, "../../../docs"),
            resolve(__dirname, "../../../../docs"),
        ];

        for (const path of possiblePaths) {
            try {
                await fs.access(path);
                return path;
            } catch {
                continue;
            }
        }
    } else {
        // In production, try multiple possible paths
        const possiblePaths = [
            // Server-side build output (from our custom build hook)
            resolve(process.cwd(), ".output/server/docs"),
            resolve(process.cwd(), "docs"),
            resolve(process.cwd(), "../docs"),
            // Nitro output public assets directory
            resolve(process.cwd(), ".output/public/docs-static"),
            // Alternative build output locations
            resolve(process.cwd(), "public/docs-static"),
            resolve(process.cwd(), ".output/docs-static"),
        ];

        for (const path of possiblePaths) {
            try {
                await fs.access(path);
                return path;
            } catch {
                continue;
            }
        }
    }

    return null;
}

/**
 * API endpoint to serve documentation files from the /docs directory
 * Supports nested directory structure and returns markdown content
 */
export default defineCachedEventHandler(
    async (event) => {
        const params = getRouterParams(event);
        let path = params.path;

        // Handle array path from catch-all routes
        if (Array.isArray(path)) {
            path = path.join("/");
        }

        // Default to index if no path provided
        if (!path || path === "") {
            path = "index";
        }

        // Safety check: ensure we don't go outside the docs directory
        if (typeof path !== "string" || path.includes("..")) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid path",
            });
        }

        try {
            const docsDir = await getDocsDirectory();

            if (!docsDir) {
                throw createError({
                    statusCode: 500,
                    statusMessage: "Documentation directory not found",
                });
            }

            // Normalize and resolve the requested file path
            const filePath = normalize(join(docsDir, `${path}.md`));

            // Ensure the file is within the docs directory
            if (!filePath.startsWith(docsDir)) {
                throw createError({
                    statusCode: 403,
                    statusMessage: "Access denied",
                });
            }

            // Check if file exists and read it
            try {
                const content = await fs.readFile(filePath, "utf-8");
                return {
                    content,
                    path: path,
                    exists: true,
                };
            } catch (fileError: any) {
                if (fileError.code === "ENOENT") {
                    throw createError({
                        statusCode: 404,
                        statusMessage: `Documentation file not found: ${path}.md`,
                    });
                }
                throw fileError;
            }
        } catch (error: any) {
            console.error("Error serving documentation:", error);

            if (error.statusCode) {
                throw error;
            }

            throw createError({
                statusCode: 500,
                statusMessage: "Internal server error",
            });
        }
    },
    {
        maxAge: 60 * 5, // Cache for 5 minutes
        getKey: (event) => {
            const params = getRouterParams(event);
            let path = params.path;
            if (Array.isArray(path)) {
                path = path.join("/");
            }
            return `docs:${path || "index"}`;
        },
    }
);
