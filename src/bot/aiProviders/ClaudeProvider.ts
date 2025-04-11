import type { AIProvider } from './AIProvider.js';

export class ClaudeProvider implements AIProvider {
    /**
     * Claude doesn't have a separate moderation API, content filtering is built-in
     * @param content The content to moderate
     * @returns Always returns false as Claude handles moderation internally
     */
    async moderateContent(content: string): Promise<boolean> {
        // Claude doesn't have a separate moderation API
        // Content filtering is built into the model
        return false;
    }

    /**
     * Generates a response using Anthropic's Claude API
     * @param chatHistory Array of message objects with role and content
     * @returns A promise resolving to the AI-generated response string
     */
    async generateResponse(chatHistory: Array<{ role: string, content: string }>): Promise<string> {
        try {
            // Extract system message
            let systemMessage = '';
            let userMessages: Array<{ role: string, content: string }> = [];

            for (const message of chatHistory) {
                if (message.role === 'system') {
                    systemMessage = message.content;
                } else {
                    // Convert all non-system messages
                    userMessages.push({
                        role: message.role === 'assistant' ? 'assistant' : 'user',
                        content: message.content
                    });
                }
            }

            const payload = {
                model: process.env.BOT_CLAUDE_MODEL,
                messages: userMessages,
                system: systemMessage, // Pass system message as a separate parameter
                max_tokens: 1024
            };

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.BOT_CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // Check for errors
            if (data.error) {
                console.error('Claude API error:', data.error);
                throw new Error(`Claude API error: ${data.error.message}`);
            }

            // Extract the message content
            let messageContent = data.content?.[0]?.text;
            return messageContent || 'No response received.';
        } catch (error) {
            console.error('Error generating response with Claude:', error);
            throw new Error(`Claude API error: ${error.message}`);
        }
    }
}
