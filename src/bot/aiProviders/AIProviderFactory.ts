import type { AIProvider } from './AIProvider.js';
import { ClaudeProvider } from './ClaudeProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

/**
 * Factory class that provides the configured AI provider
 */
export class AIProviderFactory {
    /**
     * Get the appropriate AI provider based on the config
     * @returns The configured AI provider
     */
    static getProvider(): AIProvider {
        // Check which provider is configured
        switch (process.env.AI_PROVIDER?.toLowerCase()) {
            case 'claude':
                if (!process.env.BOT_CLAUDE_API_KEY || !process.env.BOT_CLAUDE_MODEL) {
                    console.warn('Claude is selected but API key or model is missing. Falling back to OpenAI.');
                    return new OpenAIProvider();
                }
                return new ClaudeProvider();

            case 'openai':
            default:
                if (!process.env.BOT_OPENAI_API_KEY || !process.env.BOT_OPENAI_MODEL) {
                    console.error('OpenAI API key or model is missing. Check your configuration.');
                }
                return new OpenAIProvider();
        }
    }
}
