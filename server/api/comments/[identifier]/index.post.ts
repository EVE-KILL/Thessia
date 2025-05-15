import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { v4 as uuidv4 } from "uuid";
import { DiscordWebhooks } from "~/server/helpers/DiscordWebhooks";
import { cliLogger } from "~/server/helpers/Logger";
import { broadcastCommentEvent } from "~/server/helpers/WSClientManager";
import { Comments } from "~/server/models/Comments";

// Create a DOM environment for server-side sanitization
const { window } = new JSDOM("");
const DOMPurify = createDOMPurify(window);

// Configure DOMPurify to match the client-side configuration in KillComments.vue
DOMPurify.setConfig({
    // No need to specifically whitelist tags since we're using ADD_TAGS instead
    // Just ensure ALLOWED_TAGS isn't overriding our settings by not setting it explicitly

    // Use the same forbidden tags as the client
    FORBID_TAGS: ["script", "style", "form", "input", "button", "textarea", "select", "option"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onmouseout", "eval"],

    // Force HTTPS on links
    FORCE_HTTPS: true,
});

// Hook to add security attributes to all links
DOMPurify.addHook("afterSanitizeAttributes", function (node) {
    // Add security attributes to links
    if (node.tagName === "A") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
    }

    // Ensure iframe sources are from allowed domains only
    if (node.tagName === "IFRAME") {
        const src = node.getAttribute("src") || "";
        const allowedDomains = [
            "youtube.com", "www.youtube.com", "player.vimeo.com",
            "tenor.com", "giphy.com", "imgur.com"
        ];

        if (!allowedDomains.some(domain => src.includes(domain))) {
            // If not from allowed domains, remove the src attribute
            node.removeAttribute("src");
        }
    }
});

/**
 * Interface for OpenAI moderation API response
 */
interface ModerationResponse {
    id: string;
    model: string;
    results: Array<{
        flagged: boolean;
        categories: {
            sexual: boolean;
            hate: boolean;
            harassment: boolean;
            "self-harm": boolean;
            "sexual/minors": boolean;
            "hate/threatening": boolean;
            "violence/graphic": boolean;
            "self-harm/intent": boolean;
            "self-harm/instructions": boolean;
            "harassment/threatening": boolean;
            violence: boolean;
        };
        category_scores: Record<string, number>;
        flagged_categories: string[];
    }>;
}

/**
 * Sanitizes HTML content to prevent XSS attacks while preserving allowed markdown features
 * @param content Comment content to sanitize
 * @returns Sanitized HTML content
 */
function sanitizeComment(content: string): string {
    return DOMPurify.sanitize(content, {
        // Match the client-side configuration exactly
        ADD_TAGS: ["iframe", "blockquote", "video", "source"],
        ADD_ATTR: [
            "allow",
            "allowfullscreen",
            "frameborder",
            "scrolling",
            "target",
            "rel",
            "async",
            "charset",
            "data-id",
            "lang",
            "controls",
            "loop",
            "muted",
            "playsinline",
            "type",
            "src",
        ],
        // These settings match what's in the client-side code
        FORBID_TAGS: ["script", "style", "form", "input", "button", "textarea", "select", "option"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onmouseout", "eval"],
        RETURN_DOM_FRAGMENT: false,
        RETURN_DOM: false,
        RETURN_TRUSTED_TYPE: false,
    });
}

/**
 * Check if the moderation results contain prohibited content
 * @param result Moderation result from OpenAI
 * @returns Whether the content contains prohibited material
 */
function isFlagged(result: ModerationResponse["results"][0]): boolean {
    return (
        result.categories["self-harm"] ||
        result.categories["sexual/minors"] ||
        result.categories["self-harm/intent"] ||
        result.categories["self-harm/instructions"]
    );
}

/**
 * Use OpenAI's moderation API to check comment for prohibited content
 * @param text Comment text to moderate
 * @returns Object containing moderation result and possible error message
 */
async function aiModeration(text: string): Promise<{ allowed: boolean; message?: string }> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        cliLogger.warn("OpenAI API key not configured, skipping moderation");
        return { allowed: true };
    }

    try {
        const response = await fetch("https://api.openai.com/v1/moderations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ input: text }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            cliLogger.error(`Moderation API error: ${response.status} - ${errorText}`);
            // Fail open if the moderation service is unavailable
            return { allowed: true };
        }

        const data = (await response.json()) as ModerationResponse;

        if (data.results.length > 0) {
            const result = data.results[0];

            if (isFlagged(result)) {
                // Get the names of flagged categories for better error messages
                const flaggedCategories = Object.entries(result.categories)
                    .filter(
                        ([category, flagged]) =>
                            flagged &&
                            (category === "self-harm" ||
                                category === "sexual/minors" ||
                                category === "self-harm/intent" ||
                                category === "self-harm/instructions"),
                    )
                    .map(([category]) => category);

                return {
                    allowed: false,
                    message: `Comment contains potentially harmful content (${flaggedCategories.join(", ")}) and cannot be posted.`,
                };
            }
        }

        return { allowed: true };
    } catch (error) {
        cliLogger.error(`Error during content moderation: ${error}`);
        // Fail open in case of errors
        return { allowed: true };
    }
}

export default defineEventHandler(async (event) => {
    // Get the evelogin cookie to check authentication
    const cookies = parseCookies(event);
    const token = cookies.evelogin;

    if (!token) {
        return createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    const killIdentifier = event.context.params?.identifier;
    if (!killIdentifier) {
        return createError({
            statusCode: 400,
            statusMessage: "Kill identifier is required",
        });
    }

    try {
        // Get user data from the session
        const session = await $fetch("/api/auth/me", {
            headers: {
                cookie: `evelogin=${token}`,
            },
        }).catch(() => null);

        if (!session || !session.authenticated) {
            return createError({
                statusCode: 401,
                statusMessage: "Authentication failed",
            });
        }

        const user = session.user;

        // Parse the request body as JSON
        const body = await readBody(event);
        cliLogger.debug(`Received comment data: ${JSON.stringify(body)}`);

        // Extract the comment from the body
        const { comment } = body;

        if (!comment || typeof comment !== "string" || comment.trim() === "") {
            return createError({
                statusCode: 400,
                statusMessage: "Comment text is required",
            });
        }

        // First sanitize the comment to prevent XSS
        const sanitizedComment = sanitizeComment(comment);

        // Then check sanitized comment with AI moderation
        const moderationResult = await aiModeration(sanitizedComment);
        if (!moderationResult.allowed) {
            return createError({
                statusCode: 400,
                statusMessage: moderationResult.message || "Comment did not pass content moderation",
            });
        }

        // Generate a unique identifier for this comment
        const uniqueIdentifier = uuidv4();

        // Create and save the comment with sanitized content
        const newComment = new Comments({
            identifier: uniqueIdentifier,
            killIdentifier,
            comment: sanitizedComment, // Store the sanitized version
            characterId: user.characterId,
            characterName: user.characterName,
            corporationId: user.corporationId,
            corporationName: user.corporationName,
            allianceId: user.allianceId || null,
            allianceName: user.allianceName || null,
        });

        await newComment.save();

        cliLogger.debug(`New comment saved for killIdentifier: ${killIdentifier}`);

        // Broadcast the new comment via WebSocket
        await broadcastCommentEvent("new", newComment.toJSON());

        // Send notification to Discord
        await DiscordWebhooks.sendNewComment(newComment.toJSON());

        return newComment.toJSON();
    } catch (error) {
        cliLogger.error(`Error saving comment: ${error}`);
        return createError({
            statusCode: 500,
            statusMessage: "Failed to save comment",
        });
    }
});
