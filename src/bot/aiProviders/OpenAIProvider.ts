import type { AIProvider } from './AIProvider.js';

export class OpenAIProvider implements AIProvider {
    /**
     * Moderates content using OpenAI's moderation API
     * @param content The content to moderate
     * @returns A promise resolving to a boolean indicating if content is flagged
     */
    async moderateContent(content: string): Promise<boolean> {
        try {
            // If no moderation model is configured, skip moderation
            if (!process.env.BOT_OPENAI_MODERATION_MODEL) {
                return false;
            }

            // Prepare the moderation payload
            const moderationPayload = {
                model: process.env.BOT_OPENAI_MODERATION_MODEL,
                input: content
            };

            // Call the OpenAI moderation API
            const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.BOT_OPENAI_API_KEY}`
                },
                body: JSON.stringify(moderationPayload)
            });

            const moderationData = await moderationResponse.json();

            // Check if any categories are flagged
            return moderationData.results?.[0]?.categories['self-harm'] ||
                moderationData.results?.[0]?.categories['sexual/minors'] ||
                moderationData.results?.[0]?.categories['self-harm/intent'] ||
                moderationData.results?.[0]?.categories['self-harm/instructions'] ||
                moderationData.results?.[0]?.categories['violence'] || false;
        } catch (error) {
            console.error('Error with OpenAI moderation:', error);
            return false; // Default to not flagged if there's an error
        }
    }

    /**
     * Generates a response using OpenAI's chat completion API
     * @param chatHistory Array of message objects with role and content
     * @returns A promise resolving to the AI-generated response string
     */
    async generateResponse(chatHistory: Array<{ role: string, content: string }>): Promise<string> {
        try {
            const payload = {
                model: process.env.BOT_OPENAI_MODEL,
                messages: chatHistory
            };

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.BOT_OPENAI_API_KEY}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // Check for errors in the API response
            if (data.error) {
                console.error('OpenAI API error:', data.error);
                throw new Error(`OpenAI API error: ${data.error.message}`);
            }

            // Extract the message content correctly
            return data.choices?.[0]?.message?.content || 'No response received.';
        } catch (error) {
            console.error('Error generating response with OpenAI:', error);
            throw new Error(`OpenAI API error: ${error.message}`);
        }
    }
}
