import { addClient, removeClient } from "../helpers/WSClientManager";

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
      const topics = message
        .toString()
        .split(",")
        .map((topic) => topic.trim());
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
          message: "Invalid message format. Please reply with a comma-separated list of topics.",
        }),
      );
    }
  },
  close(peer) {
    removeClient(peer);
  },
});
