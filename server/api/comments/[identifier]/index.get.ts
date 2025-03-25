import { cliLogger } from "~/server/helpers/Logger";
import { Comments } from "~/server/models/Comments";

export default defineEventHandler(async (event) => {
  const identifier = event.context.params?.identifier;

  if (!identifier) {
    return createError({
      statusCode: 400,
      statusMessage: 'Identifier is required'
    });
  }

  try {
    cliLogger.debug(`Fetching comments for killIdentifier: ${identifier}`);

    // Fetch comments for the given kill identifier, sorted by createdAt in descending order
    const comments = await Comments.find({ killIdentifier: identifier })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return comments;
  } catch (error) {
    cliLogger.error(`Error fetching comments: ${error}`);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch comments'
    });
  }
});
