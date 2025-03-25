import { addCommentClient, removeCommentClient, initializeCommentSubscription } from "~/server/helpers/WSClientManager";

// Initialize the Redis subscription when this module loads
initializeCommentSubscription();

export default defineWebSocketHandler({
  open(peer) {
    addCommentClient(peer);
  },

  close(peer) {
    console.debug("Comment WebSocket client disconnected");
    removeCommentClient(peer);
  },
});
