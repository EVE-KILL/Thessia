import { AIProviderFactory } from '../aiProviders/AIProviderFactory.js';
import { splitMessageIntoChunks } from '../helper.js';
import systemPrompt from '../systemPrompt.js';

const replyCache = new Map(); // Store original user message ID and bot reply message ID
const excludedMessageIds = new Set(); // Store IDs of flagged messages

export default async function AI(client, message, botReply = null) {
    // Ignore certain channel_ids
    let ignoredChannelIds = process.env.DISCORD_IGNORED_CHANNEL_IDS?.split(',') || [];
    if (ignoredChannelIds.includes(message.channel.id)) {
        return;
    }

    // Ignore certain guild_ids
    let ignoredGuildIds = process.env.DISCORD_IGNORED_GUILD_IDS?.split(',') || [];
    if (ignoredGuildIds.includes(message.guild?.id)) {
        return;
    }

    if ((message.mentions.has(client.user) && !message.author.bot)) {
        // Show that we're typing
        await message.channel.sendTyping();

        // Fetch last 25 messages
        const messages = await message.channel.messages.fetch({ limit: 25 });

        // Filter out excluded messages and construct the array for API
        const chatHistory = messages
            .filter(msg => !excludedMessageIds.has(msg.id)) // Exclude flagged messages
            .map(msg => {
                let response = JSON.stringify({
                    content: msg.content,
                    author: (msg.member?.nickname || msg.author.username),
                    authorId: msg.author.id,
                    time: msg.createdTimestamp
                });

                // Determine if this message is from the bot or a user
                const role = msg.author.id === client.user.id ? 'assistant' : 'user';

                return {
                    role: role,
                    content: response
                };
            }).reverse();  // Reverse the array to maintain chronological order

        // Add the systemPrompt as the first message
        chatHistory.unshift({
            role: 'system',
            content: systemPrompt
        });

        try {
            // Get the configured AI provider
            const aiProvider = AIProviderFactory.getProvider();

            // Perform content moderation if needed
            const content = chatHistory.map(chat => chat.content).join('\n');
            const isFlagged = await aiProvider.moderateContent(content);

            if (isFlagged) {
                // If the content is flagged, add the message ID to the excludedMessageIds list
                messages.forEach(msg => excludedMessageIds.add(msg.id));

                // Reply with an error message and exit
                await message.reply('Your message contains content that is not allowed.');
                return;
            }

            // Generate response from the AI provider
            const reply = await aiProvider.generateResponse(chatHistory);

            // Process the reply to extract plain text from any JSON response
            const processedReply = extractTextFromPossibleJSON(reply);

            // Replace <@name> and @name with proper <@id>
            const formattedReply = await replaceMentionsWithIds(processedReply, message.guild);

            // Split the reply into chunks if necessary
            const chunks = splitMessageIntoChunks(formattedReply);

            if (botReply) {
                // If botReply is defined, edit the existing bot message
                await botReply.edit(chunks[0]);
                for (let i = 1; i < chunks.length; i++) {
                    await message.channel.send(chunks[i]);
                }
            } else {
                // Otherwise, send a new reply and store it in the cache
                const replyMessage = await message.reply(chunks[0]);
                replyCache.set(message.id, replyMessage); // Cache the user message ID and bot reply message
                for (let i = 1; i < chunks.length; i++) {
                    await message.channel.send(chunks[i]);
                }
            }

        } catch (error) {
            console.error('Error while processing message:', error);
            if (botReply) {
                await botReply.edit('There was an error processing your request.');
            } else {
                await message.reply('There was an error processing your request.');
            }
        }
    }
}

// Function to replace mentions with proper <@id> format
async function replaceMentionsWithIds(reply, guild) {
    // Regex to find all instances of <@name> and @name
    const mentionRegex = /<@(\w+)>|@(\w+)/g;
    let matches;

    // Replace the matches
    while ((matches = mentionRegex.exec(reply)) !== null) {
        const username = matches[1] || matches[2];

        // Try to find a member by nickname or username
        const member = guild.members.cache.find(m =>
            m.user.username.toLowerCase() === username.toLowerCase() ||
            (m.nickname && m.nickname.toLowerCase() === username.toLowerCase())
        );

        if (member) {
            // Replace the mention with the proper <@id> format
            reply = reply.replace(matches[0], `<@${member.user.id}>`);
        }
    }

    return reply;
}

// Function to extract text from possible JSON response
function extractTextFromPossibleJSON(text: string): string {
    // If the text starts with a curly brace, it might be JSON
    if (text.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(text);
            // Check for common fields used in responses
            if (parsed.content) {
                return parsed.content;
            } else if (parsed.message) {
                return parsed.message;
            } else if (parsed.response) {
                return parsed.response;
            } else if (parsed.text) {
                return parsed.text;
            } else if (typeof parsed === 'object') {
                // If none of the known fields are found, return the first string property
                for (const key in parsed) {
                    if (typeof parsed[key] === 'string') {
                        return parsed[key];
                    }
                }
            }
        } catch (e) {
            // If parsing fails, it wasn't valid JSON anyway
        }
    }
    return text;
}

// Export the replyCache so that it can be accessed by other parts of the bot
export { replyCache };
