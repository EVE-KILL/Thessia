import { cliLogger } from "../server/helpers/Logger";
import { KillmailsESI } from "../server/models/KillmailsESI";
import { addKillmail } from "../server/queue/Killmail";

export default {
    name: "zkbWebsocketKills",
    description: "Listen to zKillboard WebSocket for killmail notifications",
    longRunning: true,
    run: async () => {
        const wsUrl = "wss://zkillboard.com/websocket/";

        const connectWebSocket = () => {
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                cliLogger.info("✔ Connected to zKillboard WebSocket");

                // Subscribe to all killmails
                const subscribeMessage = {
                    action: "sub",
                    channel: "all:*",
                };

                ws.send(JSON.stringify(subscribeMessage));
                cliLogger.info("📡 Subscribed to all killmail channels");
            };

            ws.onmessage = async (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.action === "littlekill") {
                        const killmailId = message.killID;
                        const killmailHash = message.hash;

                        if (killmailId && killmailHash) {
                            // Check if killmail already exists in database
                            const existingKillmail = await KillmailsESI.findOne(
                                {
                                    killmail_id: killmailId,
                                    killmail_hash: killmailHash,
                                }
                            );

                            if (existingKillmail) {
                                return;
                            }

                            cliLogger.info(
                                `ℹ️  New killmail: ${killmailId} - ${killmailHash}`
                            );
                            await addKillmail(killmailId, killmailHash, 0, 1);
                        }
                    }
                } catch (error) {
                    console.error("Error parsing WebSocket message:", error);
                }
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
            };

            ws.onclose = (event) => {
                console.error(
                    `WebSocket closed: ${event.code} - ${event.reason}`
                );
                cliLogger.info(
                    "🔄 Reconnecting to zKillboard WebSocket in 5 seconds..."
                );

                // Reconnect after 5 seconds
                setTimeout(connectWebSocket, 5000);
            };
        };

        console.log("✔ Starting zKillboard WebSocket listener");
        connectWebSocket();
    },
};
