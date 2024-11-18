let clients = new Set();

export default defineWebSocketHandler({
    open(peer) {
        clients.add(peer);
    },
    message(peer, message) {
        // Do nothing, as clients should not send messages to the server
    },
    close(peer) {
        clients.delete(peer);
    }
});

// Function to send killmail messages to all connected clients
export function sendKillmailMessage(message: string) {
    clients.forEach(client => {
        client.send(message);
    });
}
