import { Client, Message } from 'discord.js';

export interface MessageHandler {
    (client: Client, message: Message, botReply?: Message): Promise<void>;
    handlesMessageUpdate?: boolean;
}
