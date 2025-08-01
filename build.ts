/**
 * Thessia Build System
 *
 * Consolidated build infrastructure for CLI, Cron, Queue binaries and asset processing.
 * This replaces the previous individual build-*.ts files with a unified system.
 *
 * Features:
 * - Auto-generates loader files for console commands, cron jobs, and queue jobs
 * - Builds optimized binaries with esbuild
 * - Downloads and modifies Cloudflare beacon script
 * - Copies documentation to build output
 * - Integrated with Nuxt.js build hooks
 *
 * Usage:
 *   bun run build.ts loaders  # Generate all loader files
 *   bun run build.ts cli      # Build CLI binary
 *   bun run build.ts cron     # Build Cron binary
 *   bun run build.ts queue    # Build Queue binary
 *   bun run build.ts all      # Build all binaries
 */

import { build } from "esbuild";
import { glob } from "glob";
import fs from "node:fs";
import path, { resolve } from "node:path";

/**
 * Build Configuration
 */
interface BuildConfig {
    projectRoot: string;
    externalModules: string[];
    packageDependencies: Record<string, string>;
}

const buildConfig: BuildConfig = {
    projectRoot: resolve("."),
    externalModules: [
        "fs",
        "path",
        "os",
        "child_process",
        "crypto",
        "events",
        "stream",
        "bun:sqlite",
    ],
    packageDependencies: {
        mongoose: "*",
        commander: "*",
        ioredis: "*",
        bullmq: "*",
        glob: "*",
        "stream-json": "*",
        "lru-cache": "*",
    },
};

/**
 * Utility function to generate the CLI loader file
 */
export function generateCliLoader(targetFile = "console/.loader.ts"): number {
    console.log("Generating CLI loader...");

    // Find all command files
    const commandFiles = glob.sync("console/**/*.{ts,js}", {
        ignore: [
            "**/.*",
            "**/.*.*",
            "**/.loader.ts",
            "**/.loader.js",
            "**/_*.ts",
            "**/_*.js",
        ],
    });

    // Generate import statements and commands object
    const importStatements: string[] = [];
    const commandEntries: string[] = [];

    for (const file of commandFiles) {
        // Extract the base filename without extension
        const baseName = file
            .replace(/^console\//, "")
            .replace(/\.(ts|js)$/, "");

        // Generate a valid variable name from the file name (handle paths with slashes)
        const varName = baseName.replace(/[-\/\\](.)/g, (_, c) =>
            c.toUpperCase()
        );

        // Calculate relative path for import
        const relativePath = `./${baseName}`;

        // Add the import statement
        importStatements.push(`import ${varName} from '${relativePath}';`);

        // Add the command entry
        commandEntries.push(`  ${varName},`);
    }

    // Create the loader file content
    const loaderContent = `// Auto-generated CLI commands loader
${importStatements.join("\n")}

// Export all command modules
export const commands = {
${commandEntries.join("\n")}
};
`;

    // Write the loader file
    const targetDir = path.dirname(resolve(targetFile));
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(resolve(targetFile), loaderContent);
    console.log(`✅ Generated CLI loader with ${commandFiles.length} commands`);

    return commandFiles.length;
}

/**
 * Utility function to generate the cron loader file
 */
export function generateCronLoader(targetFile = "cron/.loader.ts"): number {
    console.log("Generating Cron loader...");

    // Find all cron files
    const cronFiles = glob.sync("cron/**/*.{ts,js}", {
        ignore: [
            "**/.*",
            "**/.*.*",
            "**/.loader.ts",
            "**/.loader.js",
            "**/_*.ts",
            "**/_*.js",
        ],
    });

    // Generate import statements and cron job entries
    const importStatements: string[] = [];
    const cronEntries: string[] = [];

    for (const file of cronFiles) {
        // Extract the base filename without extension
        const baseName = file.replace(/^cron\//, "").replace(/\.(ts|js)$/, "");

        // Generate a valid variable name from the file name (handle paths with slashes)
        const varName = baseName.replace(/[-\/\\](.)/g, (_, c) =>
            c.toUpperCase()
        );

        // Calculate relative path for import
        const relativePath = `./${baseName}`;

        // Add the import statement
        importStatements.push(`import ${varName} from '${relativePath}';`);

        // Add the cron job entry
        cronEntries.push(`  ${varName},`);
    }

    // Create the loader file content
    const loaderContent = `// Auto-generated cron jobs loader
${importStatements.join("\n")}

// Export all cron job modules
export const cronJobs = [
${cronEntries.join("\n")}
];
`;

    // Write the loader file
    const targetDir = path.dirname(resolve(targetFile));
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(resolve(targetFile), loaderContent);
    console.log(`✅ Generated Cron loader with ${cronFiles.length} jobs`);

    return cronFiles.length;
}

/**
 * Utility function to generate the queue loader file
 */
export function generateQueueLoader(targetFile = "queue/.loader.ts"): number {
    console.log("Generating Queue loader...");

    // Find all queue files
    const queueFiles = glob.sync("queue/**/*.{ts,js}", {
        ignore: [
            "**/.*",
            "**/.*.*",
            "**/.loader.ts",
            "**/.loader.js",
            "**/_*.ts",
            "**/_*.js",
        ],
    });

    // Generate import statements and queue job entries
    const importStatements: string[] = [];
    const queueEntries: string[] = [];

    for (const file of queueFiles) {
        // Extract the base filename without extension
        const baseName = file.replace(/^queue\//, "").replace(/\.(ts|js)$/, "");

        // Generate a valid variable name from the file name (handle paths with slashes)
        const varName = baseName.replace(/[-\/\\](.)/g, (_, c) =>
            c.toUpperCase()
        );

        // Calculate relative path for import
        const relativePath = `./${baseName}`;

        // Add the import statement
        importStatements.push(`import ${varName} from '${relativePath}';`);

        // Add the queue job entry
        queueEntries.push(`  ${varName},`);
    }

    // Create the loader file content
    const loaderContent = `// Auto-generated queue jobs loader
${importStatements.join("\n")}

// Export all queue job modules
export const queueJobs = {
${queueEntries.join("\n")}
};
`;

    // Write the loader file
    const targetDir = path.dirname(resolve(targetFile));
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(resolve(targetFile), loaderContent);
    console.log(`✅ Generated Queue loader with ${queueFiles.length} jobs`);

    return queueFiles.length;
}

/**
 * Downloads the Cloudflare beacon script, modifies it to use our proxy,
 * and saves it to the public directory.
 */
export async function generateCloudflareBeacon(
    publicDir: string
): Promise<void> {
    try {
        console.log("Downloading and processing Cloudflare beacon script...");
        const beaconUrl = "https://static.cloudflareinsights.com/beacon.min.js";

        // Fetch the original beacon script
        const response = await fetch(beaconUrl);

        if (!response.ok) {
            throw new Error(
                `Failed to download Cloudflare beacon: ${response.status}`
            );
        }

        let beaconScript = await response.text();

        // Replace the Cloudflare insights URL with our proxy endpoint
        beaconScript = beaconScript.replace(
            /https:\/\/cloudflareinsights\.com\/cdn-cgi\/rum/g,
            "/api/site/cloudflare/rumproxy"
        );

        // Ensure the _ca directory exists inside the publicDir
        const outputDir = path.join(publicDir, "_ca");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Save the modified script
        const outputPath = path.join(outputDir, "cloudflare-beacon.js");
        fs.writeFileSync(outputPath, beaconScript);
        console.log(`✅ Cloudflare beacon script saved to ${outputPath}`);
    } catch (error) {
        console.error("❌ Failed to process Cloudflare beacon script:", error);
    }
}

/**
 * Copy documentation to build output directory
 */
export async function copyDocumentation(outputDir: string): Promise<void> {
    try {
        console.log("Copying documentation...");

        const sourceDocsDir = resolve(buildConfig.projectRoot, "docs");
        const targetDocsDir = resolve(outputDir, "docs");

        // Ensure source exists
        await fs.promises.access(sourceDocsDir);

        // Ensure target directory doesn't exist to avoid the copy error
        try {
            await fs.promises.rm(targetDocsDir, {
                recursive: true,
                force: true,
            });
        } catch {
            // Ignore if it doesn't exist
        }

        // Copy docs directory to output
        await fs.promises.cp(sourceDocsDir, targetDocsDir, {
            recursive: true,
            force: true,
        });

        console.log(`✅ Copied docs from ${sourceDocsDir} to ${targetDocsDir}`);
    } catch (error) {
        console.warn(`⚠️ Could not copy docs directory: ${error}`);
    }
}

/**
 * Generate all loaders
 */
export function generateAllLoaders(): void {
    console.log("🔄 Generating all loaders...");
    generateCliLoader();
    generateCronLoader();
    generateQueueLoader();
    console.log("✅ All loaders generated successfully");
}

/**
 * Build CLI binary
 */
export async function buildCLI(): Promise<void> {
    console.log("🔨 Building CLI...");

    const outdir = resolve(".output/cli");

    // Ensure output directory exists
    if (!fs.existsSync(outdir)) {
        fs.mkdirSync(outdir, { recursive: true });
    }

    // Generate the command loader file in console
    generateCliLoader();

    try {
        // Build the single console binary
        console.log("Building single CLI binary...");
        await build({
            entryPoints: ["console.ts"],
            bundle: true,
            platform: "node",
            target: "esnext",
            outfile: resolve(outdir, "console.js"),
            format: "esm",
            sourcemap: true,
            external: buildConfig.externalModules,
            alias: {
                "~": buildConfig.projectRoot,
            },
            minify: true,
            define: {
                "process.env.NODE_ENV": '"production"',
            },
        });

        // Make CLI executable
        fs.chmodSync(resolve(outdir, "console.js"), "755");

        // Create package.json in the output directory with required dependencies
        const packageJson = {
            name: "thessia-cli",
            private: true,
            type: "module",
            dependencies: buildConfig.packageDependencies,
        };

        fs.writeFileSync(
            resolve(outdir, "package.json"),
            JSON.stringify(packageJson, null, 2)
        );

        console.log("✅ CLI build completed successfully");
        console.log("Run with: bun --bun run .output/cli/console.js <command>");
    } catch (error) {
        console.error("❌ CLI build failed:", error);
        process.exit(1);
    }
}

/**
 * Build Cron binary
 */
export async function buildCron(): Promise<void> {
    console.log("🔨 Building Cron...");

    const outdir = resolve(".output/cron");

    // Ensure output directory exists
    if (!fs.existsSync(outdir)) {
        fs.mkdirSync(outdir, { recursive: true });
    }

    // Generate the cron loader file in cron
    generateCronLoader();

    try {
        // Build the single cron binary
        console.log("Building single Cron binary...");
        await build({
            entryPoints: ["cron.ts"],
            bundle: true,
            platform: "node",
            target: "esnext",
            outfile: resolve(outdir, "cron.js"),
            format: "esm",
            sourcemap: true,
            external: buildConfig.externalModules,
            alias: {
                "~": buildConfig.projectRoot,
            },
            minify: true,
            define: {
                "process.env.NODE_ENV": '"production"',
            },
        });

        // Make Cron executable
        fs.chmodSync(resolve(outdir, "cron.js"), "755");

        // Create package.json in the output directory with required dependencies
        const packageJson = {
            name: "thessia-cron",
            private: true,
            type: "module",
            dependencies: buildConfig.packageDependencies,
        };

        fs.writeFileSync(
            resolve(outdir, "package.json"),
            JSON.stringify(packageJson, null, 2)
        );

        console.log("✅ Cron build completed successfully");
        console.log("Run with: bun --bun run .output/cron/cron.js");
    } catch (error) {
        console.error("❌ Cron build failed:", error);
        process.exit(1);
    }
}

/**
 * Build Queue binary
 */
export async function buildQueue(): Promise<void> {
    console.log("🔨 Building Queue...");

    const outdir = resolve(".output/queue");

    // Ensure output directory exists
    if (!fs.existsSync(outdir)) {
        fs.mkdirSync(outdir, { recursive: true });
    }

    // Generate the queue loader file in queue
    generateQueueLoader();

    try {
        // Build the single queue binary
        console.log("Building single Queue binary...");
        await build({
            entryPoints: ["queue.ts"],
            bundle: true,
            platform: "node",
            target: "esnext",
            outfile: resolve(outdir, "queue.js"),
            format: "esm",
            sourcemap: true,
            external: buildConfig.externalModules,
            alias: {
                "~": buildConfig.projectRoot,
            },
            minify: true,
            define: {
                "process.env.NODE_ENV": '"production"',
            },
        });

        // Make Queue executable
        fs.chmodSync(resolve(outdir, "queue.js"), "755");

        // Create package.json in the output directory with all required dependencies
        const packageJson = {
            name: "thessia-queue",
            private: true,
            type: "module",
            dependencies: buildConfig.packageDependencies,
        };

        fs.writeFileSync(
            resolve(outdir, "package.json"),
            JSON.stringify(packageJson, null, 2)
        );

        console.log("✅ Queue build completed successfully");
        console.log("Run with: bun --bun run .output/queue/queue.js <command>");
    } catch (error) {
        console.error("❌ Queue build failed:", error);
        process.exit(1);
    }
}

/**
 * Build all binaries
 */
export async function buildAll(): Promise<void> {
    console.log("🏗️ Building all binaries...");

    // Generate loaders first
    generateAllLoaders();

    // Build all binaries in parallel
    await Promise.all([buildCLI(), buildCron(), buildQueue()]);

    console.log("🎉 All builds completed successfully!");
}

/**
 * Handle Nitro build hooks - used by nuxt.config.ts
 */
export async function handleNitroBuildHooks(nitro: any): Promise<void> {
    console.log("🔧 Running Nitro build hooks...");

    // Generate Cloudflare beacon
    await generateCloudflareBeacon(nitro.options.output.publicDir);

    // Copy documentation
    await copyDocumentation(nitro.options.output.dir);

    console.log("✅ Nitro build hooks completed");
}

// CLI interface when run directly
if (process.argv[1] && process.argv[1].endsWith("build.ts")) {
    const command = process.argv[2];

    switch (command) {
        case "cli":
            buildCLI();
            break;
        case "cron":
            buildCron();
            break;
        case "queue":
            buildQueue();
            break;
        case "all":
            buildAll();
            break;
        case "loaders":
            generateAllLoaders();
            break;
        default:
            console.log("Available commands:");
            console.log("  cli     - Build CLI binary");
            console.log("  cron    - Build Cron binary");
            console.log("  queue   - Build Queue binary");
            console.log("  all     - Build all binaries");
            console.log("  loaders - Generate all loaders");
            break;
    }
}
