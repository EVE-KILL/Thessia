import fetch from "node-fetch";
import { cliLogger } from "./Logger";

/**
 * Helper class for sending notifications to Discord webhooks
 */
export class DiscordWebhooks {
  /**
   * Sends a notification to a Discord webhook
   * @param webhookUrl The Discord webhook URL
   * @param content The message content to send
   */
  public static async send(webhookUrl: string, content: string): Promise<void> {
    if (!webhookUrl) {
      cliLogger.warn("Discord webhook URL not configured");
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.text();
        cliLogger.error(`Discord webhook error: ${response.status} - ${error}`);
      }
    } catch (error) {
      cliLogger.error(`Failed to send Discord webhook: ${error}`);
    }
  }

  /**
   * Sends a notification about a new comment
   * @param comment The comment data
   */
  public static async sendNewComment(comment: any): Promise<void> {
    const webhookUrl = process.env.DISCORD_NEW_COMMENT;
    if (!webhookUrl) return;

    // Generate a link to the comment
    // Format: kill:123 -> /kill/123
    const commentPath = comment.killIdentifier.replace(":", "/");
    const commentLink = `https://eve-kill.com/${commentPath}#comment-${comment.identifier}`;

    const content = `New comment by ${comment.characterName} on ${commentLink} \`\`\`${comment.comment}\`\`\``;

    await DiscordWebhooks.send(webhookUrl, content);
  }

  /**
   * Sends a notification about a reported comment
   * @param comment The comment data
   * @param reportMessage The report message
   * @param reporter The user who reported the comment
   */
  public static async sendReportedComment(
    comment: any,
    reportMessage: string,
    reporter: any,
  ): Promise<void> {
    const webhookUrl = process.env.DISCORD_REPORT_COMMENT;
    if (!webhookUrl) return;

    // Generate a link to the comment
    const commentPath = comment.killIdentifier.replace(":", "/");
    const commentLink = `https://eve-kill.com/${commentPath}#comment-${comment.identifier}`;

    const content = `🚨 COMMENT REPORTED 🚨\nReported by: ${reporter.characterName}\nComment by: ${comment.characterName}\nComment link: ${commentLink}\nReport reason: \`\`\`${reportMessage}\`\`\`\nOriginal comment: \`\`\`${comment.comment}\`\`\``;

    await DiscordWebhooks.send(webhookUrl, content);
  }
}
