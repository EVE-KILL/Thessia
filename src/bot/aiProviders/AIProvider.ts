/**
 * AIProvider interface defines common methods that all AI providers must implement
 */
export interface AIProvider {
    /**
     * Moderates content to ensure it complies with content policies
     * @param content The content to moderate
     * @returns A promise resolving to a boolean indicating if content is flagged
     */
    moderateContent(content: string): Promise<boolean>;

    /**
     * Generates a response from the AI model based on chat history
     * @param chatHistory Array of message objects with role and content
     * @returns A promise resolving to the AI-generated response string
     */
    generateResponse(chatHistory: Array<{role: string, content: string}>): Promise<string>;
}
