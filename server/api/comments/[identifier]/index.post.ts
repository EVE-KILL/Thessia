import { cliLogger } from "~/server/helpers/Logger";
import { Comments } from "~/server/models/Comments";
import { v4 as uuidv4 } from "uuid";

/**
 * Simple AI moderation function (placeholder)
 * @param text Comment text to moderate
 * @returns True if the comment passes moderation
 */
function aiModeration(text: string): boolean {
  // For now, this always returns true
  return true;
}

export default defineEventHandler(async (event) => {
  // Get the evelogin cookie to check authentication
  const cookies = parseCookies(event);
  const token = cookies.evelogin;

  if (!token) {
    return createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    });
  }

  const killIdentifier = event.context.params?.identifier;
  if (!killIdentifier) {
    return createError({
      statusCode: 400,
      statusMessage: 'Kill identifier is required'
    });
  }

  try {
    // Get user data from the session
    const session = await $fetch('/api/auth/me', {
      headers: {
        cookie: `evelogin=${token}`
      }
    }).catch(() => null);

    if (!session || !session.authenticated) {
      return createError({
        statusCode: 401,
        statusMessage: 'Authentication failed'
      });
    }

    const user = session.user;

    // Parse the request body as JSON
    const body = await readBody(event);
    cliLogger.debug(`Received comment data: ${JSON.stringify(body)}`);

    // Extract the comment from the body
    const { comment } = body;

    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      return createError({
        statusCode: 400,
        statusMessage: 'Comment text is required'
      });
    }

    // Check comment with AI moderation
    const passesModeration = aiModeration(comment);
    if (!passesModeration) {
      return createError({
        statusCode: 400,
        statusMessage: 'Comment did not pass AI moderation'
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

    return newComment.toJSON();
  } catch (error) {
    cliLogger.error(`Error saving comment: ${error}`);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to save comment'
    });
  }
});
