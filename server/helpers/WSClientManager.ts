const clients = new Map();

export function addClient(peer: any, topics: string[]) {
  clients.set(peer, topics);
}

export function removeClient(peer: any) {
  clients.delete(peer);
}

export async function broadcastKillmail(killmail: any, routingKeys: string[]) {
  const sendPromises: Promise<any>[] = [];
  clients.forEach((subscribedTopics, client) => {
    if (subscribedTopics.some((topic) => routingKeys.includes(topic))) {
      const message = JSON.stringify({ type: "killmail", data: killmail });
      sendPromises.push(client.send(message));
    }
  });

  await Promise.all(sendPromises);
}
