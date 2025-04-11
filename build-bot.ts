import { build } from "esbuild";
import { glob } from "glob";
import fs from "node:fs";
import { resolve } from "node:path";

// Utility function to generate the bot message handler loader file
export function generateMessagePluginLoader(targetFile = "src/bot/.messageLoader.ts") {
    // Find all message plugin files
    const pluginFiles = glob.sync("src/bot/onMessage/**/*.{ts,js}", {
        ignore: ["**/.*", "**/.*.*", "**/.loader.ts", "**/.loader.js", "**/_*.ts", "**/_*.js"],
    });

    // Generate import statements and plugins object
    const importStatements: string[] = [];
    const pluginEntries: string[] = [];

    for (const file of pluginFiles) {
        // Extract the base filename without extension
        const baseName = file.replace(/^src\/bot\/onMessage\//, "").replace(/\.(ts|js)$/, "");

        // Generate a valid variable name from the file name
        const varName = baseName.replace(/[-\/\\](.)/g, (_, c) => c.toUpperCase());

        // Calculate relative path for import
        const relativePath = `./${file.replace(/^src\/bot\//, "")}`;

        // Add the import statement
        importStatements.push(`import ${varName} from '${relativePath}';`);

        // Add the plugin entry
        pluginEntries.push(`  ${varName},`);
    }

    // Create the loader file content
    const loaderContent = `// Auto-generated message plugins loader
${importStatements.join("\n")}
import type { MessageHandler } from './interfaces/IMessageHandler';

// Export all message plugins
export const messagePlugins: MessageHandler[] = [
${pluginEntries.join("\n")}
];
`;

    // Write the loader file
    fs.writeFileSync(resolve(targetFile), loaderContent);

    return pluginFiles.length;
}

// Utility function to generate the bot interaction handler loader file
export function generateInteractionPluginLoader(targetFile = "src/bot/.interactionLoader.ts") {
    // Find all interaction plugin files
    const pluginFiles = glob.sync("src/bot/onInteraction/**/*.{ts,js}", {
        ignore: ["**/.*", "**/.*.*", "**/.loader.ts", "**/.loader.js", "**/_*.ts", "**/_*.js"],
    });

    // Generate import statements and plugins object
    const importStatements: string[] = [];
    const pluginEntries: string[] = [];
    const commandEntries: string[] = [];

    for (const file of pluginFiles) {
        // Extract the base filename without extension
        const baseName = file.replace(/^src\/bot\/onInteraction\//, "").replace(/\.(ts|js)$/, "");

        // Generate a valid variable name from the file name
        const varName = baseName.replace(/[-\/\\](.)/g, (_, c) => c.toUpperCase());
        const commandVarName = `${varName}Command`;

        // Calculate relative path for import
        const relativePath = `./${file.replace(/^src\/bot\//, "")}`;

        // Add the import statement
        importStatements.push(`import ${varName}, { command as ${commandVarName} } from '${relativePath}';`);

        // Add the plugin entry
        pluginEntries.push(`  ${varName},`);
        commandEntries.push(`  ${commandVarName},`);
    }

    // Create the loader file content
    const loaderContent = `// Auto-generated interaction plugins loader
${importStatements.join("\n")}
import type { InteractionHandler } from './interfaces/IInteractionHandler';

// Export all interaction plugins
export const interactionPlugins: InteractionHandler[] = [
${pluginEntries.join("\n")}
];

// Export all slash commands
export const slashCommands = [
${commandEntries.join("\n")}
].filter(Boolean); // Filter out any undefined commands
`;

    // Write the loader file
    fs.writeFileSync(resolve(targetFile), loaderContent);

    return pluginFiles.length;
}

async function buildBot() {
    console.log("Building Discord Bot...");

    const outdir = resolve(".output/bot");
    const projectRoot = resolve(".");

    // Ensure output directory exists
    if (!fs.existsSync(outdir)) {
        fs.mkdirSync(outdir, { recursive: true });
    }

    // Generate the plugin loader files
    const messagePluginsCount = generateMessagePluginLoader();
    console.log(`Generated loader for ${messagePluginsCount} message plugins`);

    const interactionPluginsCount = generateInteractionPluginLoader();
    console.log(`Generated loader for ${interactionPluginsCount} interaction plugins`);

    // List of modules that should remain external (only Node.js built-ins)
    const externalModules = [
        "fs",
        "path",
        "os",
        "child_process",
        "crypto",
        "events",
        "stream",
    ];

    try {
        // Build the bot binary
        console.log("Building Discord bot...");
        await build({
            entryPoints: ["bot.ts"],
            bundle: true,
            platform: "node",
            target: "esnext",
            outfile: resolve(outdir, "bot.js"),
            format: "esm",
            sourcemap: true,
            external: externalModules.concat(['discord.js']), // Keep discord.js external to avoid bundling issues
            alias: {
                "~": projectRoot,
            },
            minify: false, // Keep it readable for debugging
            define: {
                "process.env.NODE_ENV": '"production"',
            },
        });

        // Make bot executable
        fs.chmodSync(resolve(outdir, "bot.js"), "755");

        // Create package.json in the output directory with required dependencies
        const packageJson = {
            name: "thessia-bot",
            private: true,
            type: "module",
            dependencies: {
                "discord.js": "*",
                "chalk": "*",
                "mongoose": "*",
                "ioredis": "*",
                "moment": "*"
            },
        };

        fs.writeFileSync(resolve(outdir, "package.json"), JSON.stringify(packageJson, null, 2));

        console.log("Discord bot build completed successfully");
        console.log("Run with: bun --bun run .output/bot/bot.js");
    } catch (error) {
        console.error("Discord bot build failed:", error);
        process.exit(1);
    }
}

// If this file is being run directly, build the bot
if (require.main === module) {
    buildBot();
}
