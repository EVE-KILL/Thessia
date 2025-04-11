import chalk from 'chalk';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { cliLogger } from '~/server/helpers/Logger';

// Function to register slash commands for a plugin
export async function registerSlashCommands(commands: any[]) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN as string);

    // Register the slash commands
    cliLogger.info('Registering slash commands:');
    for (const command of commands) {
        cliLogger.info(' - ' + command.name);
    }
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID as string), { body: commands });
}

// Function to dynamically load plugins
export async function loadPlugins(pluginDirectory: string, pluginList: any[], type: string = '') {
    const pluginPath = path.resolve(pluginDirectory);
    const interactionCommandsToRegister: any[] = [];

    // Get all plugin files
    const files = fs.readdirSync(pluginPath);

    // Use for...of instead of forEach to properly handle async operations
    for (const file of files) {
        cliLogger.info('Loading plugin: ' + file);
        const { default: handler, command } = await import(path.join(pluginPath, file));

        if (type === 'interaction') {
            pluginList.push(handler);
            if (command) {
                interactionCommandsToRegister.push(command);
            }
        }
        if (type === 'message') {
            pluginList.push(handler);
        }
    }

    // Only register commands if there are any and if it's an interaction type
    if (type === 'interaction' && interactionCommandsToRegister.length > 0) {
        await registerSlashCommands(interactionCommandsToRegister);
    }
}

// Function to log messages to the terminal with timestamp and context
export const logMessageToTerminal = (message: any) => {
    const authorName = chalk.cyan(message.member ? message.member.displayName : message.author.username);
    const serverName = chalk.magenta(message.guild ? message.guild.name : 'DM');
    const channelName = chalk.yellow(message.channel.name || 'DM');

    // Convert IDs in the message content to names
    let content = message.content;
    if (message.guild) {
        content = content.replace(/<@!?(.*?)>/g, (match: string, id: string) => {
            const user = message.guild.members.cache.get(id);
            return user ? `@${user.displayName}` : match;
        });
    }

    const logMessage = `${authorName} / #${channelName} / ${serverName}: ${chalk.white(content)}`;
    cliLogger.info(logMessage);
};

// Function to split long messages into chunks of up to 2000 characters
export const splitMessageIntoChunks = (message: string, chunkSize = 2000) => {
    const chunks: string[] = [];
    let currentChunk = '';

    for (const word of message.split(' ')) {
        if (currentChunk.length + word.length + 1 > chunkSize) {
            chunks.push(currentChunk);
            currentChunk = '';
        }
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
};

// Function to resolve a user ID to a user object
export async function resolveIdToUser(client: any, userId: string) {
    try {
        return await client.users.fetch(userId);
    } catch (error: any) {
        cliLogger.error(`Failed to fetch user with ID ${userId}: ${error.message}`);
        return null;
    }
}
