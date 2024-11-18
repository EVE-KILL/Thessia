import { Killmail } from "~/types/IKillmail";

const validTopics = [
    'all', '10b', '5b', 'abyssal', 'wspace', 'highsec', 'lowsec', 'nullsec',
    'bigkills', 'solo', 'npc', 'citadel', 't1', 't2', 't3', 'frigates',
    'destroyers', 'cruisers', 'battlecruisers', 'battleships', 'capitals',
    'freighters', 'supercarriers', 'titans'
];

let clients = new Map();

export default defineWebSocketHandler({
    open(peer) {
        peer.send(JSON.stringify({
            type: 'info',
            message: 'Welcome! Please reply with a comma-separated list of topics you want to subscribe to.',
            validTopics: validTopics
        }));
    },
    async message(peer, message) {
        try {
            const topics = message.toString().split(',').map(topic => topic.trim());
            const invalidTopics = topics.filter(topic => !validTopics.includes(topic));
            if (invalidTopics.length > 0) {
                peer.send(JSON.stringify({
                    type: 'error',
                    message: `Invalid topics: ${invalidTopics.join(', ')}. Please reply with a valid list of topics.`
                }));
                return;
            }
            peer.send(JSON.stringify({ type: 'subscribed', topics: topics }));
            clients.set(peer, topics);
        } catch (error) {
            peer.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format. Please reply with a comma-separated list of topics.'
            }));
        }
    },
    close(peer) {
        clients.delete(peer);
    }
});

// Function to send killmail messages to all connected clients
export async function sendKillmailMessage(killmail: Killmail) {
    const routingKeys = determineRoutingKeys(killmail);
    for (const [client, subscribedTopics] of clients.entries()) {
        if (subscribedTopics.some(topic => routingKeys.includes(topic))) {
            await client.send(JSON.stringify({
                type: 'killmail',
                data: killmail
            }));
        }
    }
}

function determineRoutingKeys(killmail: Killmail) {
    const routingKeys = new Set(['all']);
    const totalValue = Number(killmail.total_value) || 0;

    if (totalValue > 1_000_000_000) routingKeys.add('10b');
    if (totalValue > 500_000_000) routingKeys.add('5b');
    const regionId = Number(killmail.region_id);
    if (regionId >= 12_000_000 && regionId <= 13_000_000) routingKeys.add('abyssal');
    if (regionId >= 11_000_001 && regionId <= 11_000_033) routingKeys.add('wspace');
    const systemSecurity = Number(killmail.system_security);
    if (systemSecurity >= 0.45) routingKeys.add('highsec');
    else if (systemSecurity >= 0.0) routingKeys.add('lowsec');
    else routingKeys.add('nullsec');
    const shipGroupId = Number(killmail.victim.ship_group_id);
    if ([547, 485, 513, 902, 941, 30, 659].includes(shipGroupId)) routingKeys.add('bigkills');
    if (killmail.is_solo) routingKeys.add('solo');
    if (killmail.is_npc) routingKeys.add('npc');
    if ([1657, 1406, 1404, 1408, 2017, 2016].includes(shipGroupId)) routingKeys.add('citadel');
    if ([419, 27, 29, 547, 26, 420, 25, 28, 941, 463, 237, 31].includes(shipGroupId)) routingKeys.add('t1');
    if ([324, 898, 906, 540, 830, 893, 543, 541, 833, 358, 894, 831, 902, 832, 900, 834, 380].includes(shipGroupId)) routingKeys.add('t2');
    if ([963, 1305].includes(shipGroupId)) routingKeys.add('t3');
    if ([324, 893, 25, 831, 237].includes(shipGroupId)) routingKeys.add('frigates');
    if ([420, 541].includes(shipGroupId)) routingKeys.add('destroyers');
    if ([906, 26, 833, 358, 894, 832, 963].includes(shipGroupId)) routingKeys.add('cruisers');
    if ([419, 540].includes(shipGroupId)) routingKeys.add('battlecruisers');
    if ([27, 898, 900].includes(shipGroupId)) routingKeys.add('battleships');
    if ([547, 485].includes(shipGroupId)) routingKeys.add('capitals');
    if ([513, 902].includes(shipGroupId)) routingKeys.add('freighters');
    if ([659].includes(shipGroupId)) routingKeys.add('supercarriers');
    if ([30].includes(shipGroupId)) routingKeys.add('titans');

    return Array.from(routingKeys);
}
