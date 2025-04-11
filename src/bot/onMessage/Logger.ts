import { logMessageToTerminal } from '../helper.js';

export default async function Logger(client, message) {
    // Ignore certain channel_ids
    let ignoredChannelIds = process.env.DISCORD_IGNORED_CHANNEL_IDS?.split(',') || [];
    if (ignoredChannelIds.includes(message.channel.id)) {
        return;
    }

    // Ignore certain guild_ids
    let ignoredGuildIds = process.env.DISCORD_IGNORED_GUILD_IDS?.split(',') || [];
    if (ignoredGuildIds.includes(message.guild.id)) {
        return;
    }

    logMessageToTerminal(message);
}
