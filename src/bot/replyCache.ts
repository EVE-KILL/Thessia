import { Message } from 'discord.js';

// Cache to store bot replies to messages
const replyCache = new Map<string, Message>();

export { replyCache };
