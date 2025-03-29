import { v4 as uuidv4 } from "uuid";
import { DiscordWebhooks } from "~/server/helpers/DiscordWebhooks";
import { cliLogger } from "~/server/helpers/Logger";
import { broadcastCommentEvent } from "~/server/helpers/WSClientManager";
import { Comments } from "~/server/models/Comments";

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

    // Check comment with AI moderation
    const moderationResult = await aiModeration(comment);
    if (!moderationResult.allowed) {
      return createError({
        statusCode: 400,
        statusMessage: moderationResult.message || "Comment did not pass content moderation",
      });
    }

    // Generate a unique identifier for this comment
    const uniqueIdentifier = uuidv4();

    // Create and save the comment
    const newComment = new Comments({
      identifier: uniqueIdentifier,
      killIdentifier,
      comment,
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
