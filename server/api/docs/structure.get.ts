import { promises as fs } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

interface DocFile {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: DocFile[];
}

/**
 * Get the documentation directory path based on environment
 */
async function getDocsDirectory(): Promise<string | null> {
    // In development, read from the source docs directory
    if (process.env.NODE_ENV === "development") {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const projectRoot = resolve(__dirname, "../../../");

        const possiblePaths = [
            resolve(projectRoot, "docs"),
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
                console.log(`Found docs directory at: ${path}`);
                return path;
            } catch {
                console.log(`Docs directory not found at: ${path}`);
                continue;
            }
        }
    }

    console.error("No docs directory found in any location");
    return null;
}

/**
 * Recursively scan a directory and build a tree structure
 */
async function scanDirectory(
    dirPath: string,
    relativePath: string = ""
): Promise<DocFile[]> {
    const items: DocFile[] = [];

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dirPath, entry.name);
            const itemRelativePath = relativePath
                ? `${relativePath}/${entry.name}`
                : entry.name;

            if (entry.isDirectory()) {
                const children = await scanDirectory(
                    fullPath,
                    itemRelativePath
                );
                if (children.length > 0) {
                    items.push({
                        name: entry.name,
                        path: itemRelativePath,
                        type: "directory",
                        children,
                    });
                }
            } else if (entry.isFile() && entry.name.endsWith(".md")) {
                // Remove .md extension from the path for cleaner URLs
                const pathWithoutExtension = itemRelativePath.replace(
                    /\.md$/,
                    ""
                );
                items.push({
                    name: entry.name.replace(/\.md$/, ""),
                    path: pathWithoutExtension,
                    type: "file",
                });
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${dirPath}:`, error);
    }

    return items.sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
        }
        // Index files first within each type
        if (a.name === "index") return -1;
        if (b.name === "index") return 1;
        // Alphabetical order
        return a.name.localeCompare(b.name);
    });
}

/**
 * API endpoint to get the documentation directory structure
 */
export default defineCachedEventHandler(
    async () => {
        try {
            const docsDir = await getDocsDirectory();

            if (!docsDir) {
                return {
                    structure: [],
                    error: "Documentation directory not found",
                };
            }

            const structure = await scanDirectory(docsDir);

            return {
                structure,
                error: null,
            };
        } catch (error: any) {
            console.error("Error getting docs structure:", error);
            return {
                structure: [],
                error: "Failed to load documentation structure",
            };
        }
    },
    {
        maxAge: 1000 * 60 * 10, // Cache for 10 minutes
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: () => "docs:structure",
    }
);
