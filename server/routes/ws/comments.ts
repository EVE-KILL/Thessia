import {
  addCommentClient,
  initializeCommentSubscription,
  removeCommentClient,
  handleCommentClientPong,
} from "~/server/helpers/WSClientManager";

// Initialize the Redis subscription when this module loads
initializeCommentSubscription();

export default defineWebSocketHandler({
  open(peer) {
    addCommentClient(peer);
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle pong responses to keep connection alive
      if (data.type === "pong") {
        handleCommentClientPong(peer);
      }
      // Add other message handling logic here if needed
    } catch (error) {
      // Ignore non-JSON messages (original behavior)
    }
  },

  close(peer) {
    removeCommentClient(peer);
  },
});
