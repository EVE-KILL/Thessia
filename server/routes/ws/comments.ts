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
    console.debug("Comment WebSocket client connected");
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
      console.debug("Received non-JSON message from comment client, ignoring");
    }
  },

  close(peer) {
    console.debug("Comment WebSocket client disconnected");
    removeCommentClient(peer);
  },
});
