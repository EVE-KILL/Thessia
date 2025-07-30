import {
  addClient,
  initializeKillmailSubscription,
  removeClient,
  handleKillmailClientPong,
} from "~/server/helpers/WSClientManager";

const validTopics = [
  "all",
  "10b",
  "5b",
  "abyssal",
  "wspace",
  "highsec",
  "lowsec",
  "nullsec",
  "bigkills",
  "solo",
  "npc",
  "citadel",
  "t1",
  "t2",
  "t3",
  "frigates",
  "destroyers",
  "cruisers",
  "battlecruisers",
  "battleships",
  "capitals",
  "freighters",
  "supercarriers",
  "titans",
];

const partialTopics = ["victim.", "attacker.", "system.", "region."];

// Initialize the Redis subscription when this module loads
initializeKillmailSubscription();

export default defineWebSocketHandler({
  open(peer) {
    peer.send(
      JSON.stringify({
        type: "info",
        message:
          "Welcome! Please reply with a comma-separated list of topics you want to subscribe to.",
        validTopics: validTopics,
      }),
    );
  },
  async message(peer, message) {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle pong responses
      if (data.type === "pong") {
        handleKillmailClientPong(peer);
        return;
      }

      // Handle topic subscription (backward compatibility)
      let topics: string[];
      if (data.type === "subscribe" && Array.isArray(data.topics)) {
        topics = data.topics;
      } else if (typeof data === "string" || Array.isArray(data)) {
        // Backward compatibility: direct topic list
        topics = Array.isArray(data) ? data : data.split(",").map((topic: string) => topic.trim());
      } else if (typeof data.topics === "string") {
        topics = data.topics.split(",").map((topic: string) => topic.trim());
      } else {
        // Fallback to parsing message as comma-separated string
        topics = message
          .toString()
          .split(",")
          .map((topic) => topic.trim());
      }

      const invalidTopics = topics.filter(
        (topic) =>
          !validTopics.includes(topic) && !partialTopics.some((prefix) => topic.startsWith(prefix)),
      );
      
      if (invalidTopics.length > 0) {
        peer.send(
          JSON.stringify({
            type: "error",
            message: `Invalid topics: ${invalidTopics.join(", ")}. Please reply with a valid list of topics.`,
          }),
        );
        return;
      }
      
      peer.send(JSON.stringify({ type: "subscribed", topics: topics }));
      addClient(peer, topics);
    } catch (error) {
      peer.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format. Please send a JSON object with 'type' and 'topics' fields, or a comma-separated list of topics.",
        }),
      );
    }
  },
  close(peer) {
    console.debug("Killmail WebSocket client disconnected");
    removeClient(peer);
  },
});
