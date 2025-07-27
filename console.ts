#!/usr/bin/env bun
import { Command } from "commander";
import mongoose from "mongoose";
import { initMongooseConnection } from "./server/helpers/Mongoose";
// Use the generated loader file
import { commands } from "./src/console/.loader";

const program = new Command();

// Create a connection flag
let mongooseConnected = false;

async function ensureMongooseConnection() {
    if (!mongooseConnected) {
        try {
            await initMongooseConnection();
            mongooseConnected = true;
        } catch (error) {
            console.error("Failed to connect to MongoDB:", error);
            throw error;
        }
    }
    return mongooseConnected;
}

async function main() {
    // Initialize database connection at startup
    await ensureMongooseConnection();

    // Keep track of command metadata
    const commandsMetadata: { name: string; longRunning: boolean }[] = [];

    // Register all commands from the generated loader
    Object.entries(commands).forEach(([name, commandModule]) => {
        const command = program
            .command(name)
            .description(commandModule.description)
            .allowUnknownOption(true);

        // Add options if they exist (use 'any' to bypass TypeScript checking for optional properties)
        const moduleAny = commandModule as any;
        if (moduleAny.options) {
            moduleAny.options.forEach((option: any) => {
                command.option(
                    option.flags,
                    option.description,
                    option.defaultValue
                );
            });
        }

        // Add examples to help if they exist
        if (moduleAny.examples) {
            const originalHelp = command.helpInformation.bind(command);
            command.helpInformation = function () {
                let help = originalHelp();
                help += "\nExamples:\n";
                moduleAny.examples.forEach((example: string) => {
                    help += `  ${example}\n`;
                });
                return help;
            };
        }

        command
            .argument("[args...]", "Command arguments")
            .action(async (args) => {
                try {
                    // Pass the raw args array directly to the run function
                    await commandModule.run(args || []);
                } catch (error) {
                    console.error(`Error executing command ${name}:`, error);
                    throw error;
                }
            });

        commandsMetadata.push({
            name,
            longRunning: !!commandModule.longRunning,
        });
    });

    await program.parseAsync(process.argv);

    // Determine which command was invoked
    const invokedCommandName = program.args[0];
    const invokedCommand = commandsMetadata.find(
        (cmd) => cmd.name === invokedCommandName
    );

    // If it's not a long-running command, clean up and exit
    if (!invokedCommand?.longRunning) {
        if (mongooseConnected) {
            await mongoose.disconnect();
            // Add a small delay to ensure disconnection completes
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        process.exit(0);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
