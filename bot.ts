import chalk from 'chalk';
import { Client, GatewayIntentBits, type Interaction, type Message } from 'discord.js';
import { cliLogger } from './server/helpers/Logger';
import { interactionPlugins, slashCommands } from './src/bot/.interactionLoader';
import { messagePlugins } from './src/bot/.messageLoader';
import { registerSlashCommands } from './src/bot/helper';
import { replyCache } from './src/bot/replyCache';

// Create a new Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.on('ready', async () => {
    if (client.user) {
        cliLogger.info(`Logged in as ${client.user.tag}`);
        const inviteLink = chalk.yellow(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=274881563713&scope=bot`);
        cliLogger.info(`Invite link: ${inviteLink}`);
        cliLogger.info(`Server count: ${client.guilds.cache.size}`);

        cliLogger.info(`Connected to ${client.guilds.cache.size} servers`);
        for (const guild of client.guilds.cache.values()) {
            cliLogger.info(`- ${guild.name} (${guild.id})`);
        }

        // Register all slash commands at startup
        try {
            await registerSlashCommands(slashCommands);
        } catch (error) {
            cliLogger.error('Failed to register slash commands:', error);
        }
    }
});

client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // Process the interaction through all loaded interaction plugins
    for (const plugin of interactionPlugins) {
        try {
            await plugin(interaction, client);
        } catch (error) {
            console.error('Error in interaction plugin:', error);
        }
    }
});

client.on('messageCreate', async (message: Message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Process the message through all loaded message plugins
    for (const plugin of messagePlugins) {
        try {
            await plugin(client, message);
        } catch (error) {
            console.error('Error in message plugin:', error);
        }
    }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    // If the newMessage is not a Message instance or came from a bot, ignore
    if (!newMessage.author || newMessage.author.bot) return;

    // Type assertion to handle the newMessage object
    const updatedMessage = newMessage as Message;

    // Log the updated message
    cliLogger.info(`Message updated in ${updatedMessage.guild?.name}`);

    // Check if the bot has already replied to this message
    if (replyCache.has(updatedMessage.id)) {
        const botReply = replyCache.get(updatedMessage.id);
        for (const plugin of messagePlugins) {
            // Only trigger plugins that handle message updates
            if (plugin.handlesMessageUpdate) {
                try {
                    await plugin(client, updatedMessage, botReply);
                } catch (error) {
                    console.error('Error in message update plugin:', error);
                }
            }
        }
    }
});

client.on('guildCreate', async (guild) => {
    cliLogger.info(`Joined a new guild: ${guild.name} (${guild.id})`);
    cliLogger.info(`New server count: ${client.guilds.cache.size}`);
});

client.on('guildDelete', async (guild) => {
    cliLogger.info(`Left a guild: ${guild.name} (${guild.id})`);
    cliLogger.info(`New server count: ${client.guilds.cache.size}`);
});

client.login(process.env.DISCORD_TOKEN);

process.on('SIGINT', async () => {
    cliLogger.info('SIGINT received, shutting down...');
    await client.destroy();
    process.exit(0);
});
