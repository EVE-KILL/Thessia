# Topics & Routing

## Overview

EVE-KILL WebSocket endpoints use topic-based routing to deliver relevant messages to clients. This allows clients to subscribe only to the data they need, reducing bandwidth and improving performance.

## Topic Formats

### Killmails WebSocket Topics

| Pattern | Description | Example | Matches |
|---------|-------------|---------|---------|
| `all` | All killmails | `all` | Every killmail event |
| `10b` | 10+ billion ISK kills | `10b` | Very high value kills |
| `5b` | 5+ billion ISK kills | `5b` | High value kills |
| `abyssal` | Abyssal space kills | `abyssal` | Kills in abyssal deadspace |
| `wspace` | Wormhole space kills | `wspace` | Kills in wormhole systems |
| `highsec` | High security space | `highsec` | Kills in high security systems |
| `lowsec` | Low security space | `lowsec` | Kills in low security systems |
| `nullsec` | Null security space | `nullsec` | Kills in null security systems |
| `bigkills` | Big kills | `bigkills` | Significant/notable kills |
| `solo` | Solo kills | `solo` | Single attacker kills |
| `npc` | NPC kills | `npc` | Kills involving NPCs |
| `citadel` | Citadel kills | `citadel` | Structure/citadel kills |
| `t1` | Tech 1 ships | `t1` | T1 ship kills |
| `t2` | Tech 2 ships | `t2` | T2 ship kills |
| `t3` | Tech 3 ships | `t3` | T3 ship kills |
| `frigates` | Frigate kills | `frigates` | Frigate class ships |
| `destroyers` | Destroyer kills | `destroyers` | Destroyer class ships |
| `cruisers` | Cruiser kills | `cruisers` | Cruiser class ships |
| `battlecruisers` | Battlecruiser kills | `battlecruisers` | Battlecruiser class ships |
| `battleships` | Battleship kills | `battleships` | Battleship class ships |
| `capitals` | Capital ship kills | `capitals` | Capital class ships |
| `freighters` | Freighter kills | `freighters` | Freighter ships |
| `supercarriers` | Supercarrier kills | `supercarriers` | Supercarrier ships |
| `titans` | Titan kills | `titans` | Titan class ships |
| `victim.{id}` | Victim ID filter | `victim.123456` | Kills where entity 123456 is victim |
| `attacker.{id}` | Attacker ID filter | `attacker.123456` | Kills where entity 123456 is attacker |
| `system.{id}` | Solar system filter | `system.30000142` | Kills in system 30000142 (Jita) |
| `region.{id}` | Region filter | `region.10000002` | Kills in region 10000002 (The Forge) |

### Site Events WebSocket Topics

| Pattern | Description | Example | Matches |
|---------|-------------|---------|---------|
| `all` | All site events | `all` | Every site notification |
| `user.{id}` | User-specific events | `user.123` | Events for user 123 |
| `component.{name}` | Component events | `component.navbar` | Navbar-related events |

### Comments WebSocket

Comments WebSocket does not use topic-based routing. All connected clients receive all comment events.

## Subscription Examples

### Single Topic

```javascript
// Subscribe to all killmails
ws.send('all');

// Subscribe to titan kills
ws.send('titans');

// Subscribe to nullsec kills
ws.send('nullsec');
```

### Multiple Topics

```javascript
// Comma-separated topics
ws.send('capitals,supercarriers,titans');

// Multiple value tiers
ws.send('5b,10b');

// Combination of filters
ws.send('nullsec,solo,victim.123456');
```

### Dynamic Subscription

```javascript
const ws = new WebSocket('wss://ws.eve-kill.com/killmails');

// Start with all killmails
ws.onopen = () => {
    ws.send('all');
};

// Add specific filters
function addFilters() {
    ws.send('capitals,nullsec,5b');
}

// Change subscription to specific entity
function addEntity(entityId) {
    ws.send(`victim.${entityId},attacker.${entityId}`);
}
```

## Routing Logic

### Killmail Routing

When a killmail is published, the system generates routing keys based on:

1. **Victim Information**
   - `character:{victim.character_id}`
   - `corporation:{victim.corporation_id}`
   - `alliance:{victim.alliance_id}` (if present)

2. **Attacker Information**
   - `character:{attacker.character_id}` (for each attacker)
   - `corporation:{attacker.corporation_id}` (for each attacker)
   - `alliance:{attacker.alliance_id}` (for each attacker, if present)

3. **Location Information**
   - `system:{solar_system_id}`
   - `region:{region_id}`

4. **Universal**
   - `all`

### Example Routing

For a killmail where:
- Victim: Character 123456 from Corporation 987654 in Alliance 456789
- Attacker: Character 789012 from Corporation 345678 (no alliance)
- Location: Jita (system 30000142, region 10000002)

Generated routing keys:
```text
all
character:123456
corporation:987654
alliance:456789
character:789012
corporation:345678
system:30000142
region:10000002
```

Clients subscribed to any of these topics will receive the killmail.

## Topic Validation

### Killmail Topics

```javascript
function isValidKillmailTopic(topic) {
    // Universal topic
    if (topic === 'all') return true;

    // Character ID (numeric)
    if (/^\d+$/.test(topic)) return true;

    // Prefixed topics
    const prefixPatterns = [
        /^alliance:\d+$/,
        /^corporation:\d+$/,
        /^character:\d+$/,
        /^region:\d+$/,
        /^system:\d+$/
    ];

    return prefixPatterns.some(pattern => pattern.test(topic));
}
```

### Site Event Topics

```javascript
function isValidSiteEventTopic(topic) {
    // Universal topic
    if (topic === 'all') return true;

    // User-specific topics
    if (topic.startsWith('user.')) return true;

    // Component-specific topics
    if (topic.startsWith('component.')) return true;

    return false;
}
```

## Best Practices

### Subscription Strategies

1. **Start Broad, Narrow Down**
   ```javascript
   // Start with all killmails
   ws.send('all');

   // Later, add specific interests
   ws.send('alliance:456789,corporation:987654');
   ```

2. **Use Specific Topics for Performance**
   ```javascript
   // Instead of filtering all killmails client-side
   ws.send('all'); // ❌ Inefficient

   // Subscribe to specific interests
   ws.send('alliance:456789,region:10000002'); // ✅ Efficient
   ```

3. **Manage Subscriptions Dynamically**
   ```javascript
   class TopicManager {
       constructor(websocket) {
           this.ws = websocket;
           this.activeTopics = new Set();
       }

       subscribe(topics) {
           const newTopics = topics.filter(topic => !this.activeTopics.has(topic));
           if (newTopics.length > 0) {
               newTopics.forEach(topic => this.activeTopics.add(topic));
               this.ws.send(JSON.stringify({
                   type: 'subscribe',
                   topics: newTopics
               }));
           }
       }

       unsubscribe(topics) {
           const existingTopics = topics.filter(topic => this.activeTopics.has(topic));
           if (existingTopics.length > 0) {
               existingTopics.forEach(topic => this.activeTopics.delete(topic));
               this.ws.send(JSON.stringify({
                   type: 'unsubscribe',
                   topics: existingTopics
               }));
           }
       }
   }
   ```

### Topic Naming Conventions

1. **Use Consistent Formats**
   - Numeric IDs: `123456`
   - Prefixed IDs: `alliance:456789`
   - Hierarchical: `user.123.notifications`

2. **Avoid Special Characters**
   - Use alphanumeric characters, dots, and colons only
   - No spaces or special symbols

3. **Keep Topics Readable**
   ```javascript
   // Good
   'alliance:456789'
   'region:10000002'
   'user.123'

   // Avoid
   'a:456789'
   'r:10000002'
   'u123'
   ```

## Performance Implications

### Topic Granularity

- **Too Broad**: Receiving unnecessary messages increases bandwidth
- **Too Narrow**: Many subscriptions can increase server overhead
- **Optimal**: Balance between relevance and subscription count

### Subscription Limits

- Maximum 50 active topics per connection
- Topics are case-sensitive
- Duplicate topics are automatically filtered

### Routing Performance

The server uses efficient topic matching:
- O(1) lookup for exact matches
- O(n) for prefix matches where n = number of prefixes
- Automatic cleanup of unused topics
