# Future Ideas for EVE Kill

## To AI
Generate IDEAS.md with the ideas outlined in this document, also generate a BUGS.md with the bugs listed in this document.
This entire document is unordered, and basically just a thought mess - so read the existing IDEAS.md and BUGS.md to see what was written before about them.

Don't try and invent things to add into IDEAS.md or BUGS.md, stay true to what is written here - but add information where it seems like it would be useful

---

## Super Naming

It is safe to assume that a players supercap is the same supercap until it explodes.
This means we can make a history for the supercap in question - maybe even give it a name (Random name unless the pilot has a name for it).
This history can be used to track the supercap's kills, losses, and other events.

## Graph Theory

EVE Graph-Based Relationship Engine,
(Draft – generated 2025-05-18 17:50 UTC)

---

Concept in One Breath,
,
Treat every character, corporation, alliance as a node.,
Emit an edge for every event (kill, repair, join/leave).
+ weight when two actors cooperate (same kill-mail side, reps, boosts).,
– weight when they oppose each other (killer ↔ victim).,
,
Events are immutable; you always append, never overwrite.,
Slice the timeline to rebuild “state as of X” or rolling windows.,
Maintain two edge layers: raw FACT history and pre-baked AGG windows.,

---

Temporal Graph Data Model,
,
2.1 Nodes,
[
  { "id": "char_123", "type": "character", "name": "Glaurung" },
  { "id": "corp_10",  "type": "corporation", "name": "Doom Corp" },
  { "id": "ally_2",   "type": "alliance",    "name": "Northern Coalition" }
]


2.2 Edges,
| Layer          | Purpose            | Core fields                                                                  |
| -------------- | ------------------ | ---------------------------------------------------------------------------- |
| edges_fact | Immutable events   | source, target, relationship, ts or valid_from / valid_to, value |
| edges_agg  | Window snapshots   | source, target, relationship, window, weight                        |

2.3 Minimal Temporal Snapshot,
{
  "edges_fact": [
    {
      "source": "char_123", "target": "corp_10",
      "relationship": "member_of",
      "valid_from": "2025-02-14T12:00:00Z",
      "valid_to": "2025-04-30T23:59:59Z"
    },
    {
      "source": "char_123", "target": "char_456",
      "relationship": "kill",
      "ts": "2025-04-16T18:22:09Z",
      "value": -5
    }
  ],
  "edges_agg": [
    {
      "source": "char_123", "target": "char_456",
      "relationship": "combat",
      "window": "2025-04-19/2025-05-18",
      "weight": -35
    }
  ]
}


---

Example Character Report (last 30 days),
,
{
  "character": {
    "id": "char_123",
    "name": "Glaurung",
    "corp": { "id": "corp_99", "name": "Lightforge Ltd", "since": "2025-05-01" },
    "alliance": { "id": "ally_8", "name": "Test Alliance Please Ignore" }
  },
  "activity": {
    "kills": 28,
    "losses": 4,
    "isk_destroyed": 12450000000,
    "isk_lost": 1780000000
  },
  "relationships": {
    "top_allies": [
      { "target_id": "char_456", "name": "Kaltana", "weight": 37 }
    ],
    "top_enemies": [
      { "target_id": "char_990", "name": "Frosty", "weight": -44 }
    ]
  }
}


---

Key Points & Implementation Notes,
,
Membership shifts are just new member_of edges with fresh valid_from; historical queries pick the right corp/alliance automatically.,
Nightly (or streaming) jobs roll FACT → AGG for 7‑day, 30‑day, lifetime windows.,
Temporal graph DBs that fit: Neo4j + GDS, Memgraph, Apache AGE on PostgreSQL.,
UI / API reads AGG for speed; deep analytics read FACT directly.,

---

Handy Cypher Snippets,
,
/* Hottest wars this month */
MATCH (a:Alliance)-[r:war]->(b:Alliance)
WHERE r.window = "2025-04-19/2025-05-18" AND r.weight < -100
RETURN a.name, b.name, r.weight
ORDER BY r.weight ASC;

/* Cooperation score between two pilots (last 30 d) */
MATCH (c1:Character {id:"char_123"})-[r:combat]-(c2:Character {id:"char_456"})
WHERE r.window = "2025-04-19/2025-05-18"
RETURN r.weight;


---

Short, direct, future‑proof.

## Wrapped

Basically Spotify Wrapped, but for EVE and Killmails

## Intel for Corp/Alli

+ Make it possible to use the PossibleFC to list possible FCs in the corp/alli

+ Make it possible to list which supercap pilots there might be (supercarrier and titan)

+ Make it possible to list which capital pilots there might be (dreadnought, carrier, force auxiliary)

## Fleet Commander View

Fleet commander logs in to EVE-KILL and sets a new fleet up, and gets a link that he shares with those in his fleet.

The people in the fleet click on the link and login to EVE-KILL, and join the fleet (They might not need to give special permissions if the FC does?)
Then the view shows who is in fleet, and as the fleet progresses kills done by the members in the fleet is collated into the view so the FC can see what kills are being done.

Meanwhile in the background, every minute via cronjob the updater runs, getting the current location of the FC, and who is in the fleet - and also collects the killmails.
In the UI itself, the FC can see who is in the fleet, how many and what kills have been had, they also have quick access to the localscan/dscan tools that'll let them
look up information on players they come across in the systems they are in. (It should filter out their own fleet members.)
At the same time, it should also know which systems are around the system the FC is in and list them, and how many kills have been made there the last 5/10/15/30/60 minutes.

Additionally any character using the shared link, when they put data into local scan / dscan - it should be shown to the FC of the fleet

```text
Actually that'd be pretty decent. FC starts a session, sends a "join me" link to the fleet, they all Auth individually under that shared session I'd, then for the duration akk kms collected by those people get pulled via ESI and associated to the session. At the end the FC can close the session and get an accurate roam report
You can always see your own kills in real time. Kill boards just let people aggregate them beyond their corp
--- Axium Cog
```

## Faction Warfare

Caldari vs Gallente
Amarr vs Minmatar

Use the layout of Advanced View
And update the rest of the kills pages to use a similar layout (Maybe simply switch to using the same internal calls as advanced view already does?)

Only show stats calculated for the past 30 days

## Common ship statistics

Make the ship statistics a common component, and add links to the advanced search with pre-filled ship_group_id to view kills for that specific group

## Short url for advanced search

Make it possible to create a short url for the advanced search, so that you can share it with others.

## Application proxy

A proxy running in cloudflare workers, using cloudflare storage for caching - that basically sits between the application and eve-kill.
this should prevent the application from not having any data, in cases where eve-kill might be down for a short spell (or overloaded)

## Component updates and user/site notifications (Partially implemented)

Use the new site websocket with notifications for all, and users and also add component updates.

That way components (Like updating the price on a ship for the custom pricing, or updating a characters information, requesting a reprocessing of a killmail etc.) can send their request to an API endpoint for component updates, and then get notified of the updates completion, and then have the component update automatically with the new data.

So far the site api and notifications for site, and users are implemented, but the component updates are not yet done.

## Fix header on character, corporation, alliance, etc.

fix advanced search to use colors similar to campaigncreator (and fix battlecreator while at it, it also looks hideous)
fix stats page to also use colors similar to campaigncreator.
fix campaigns as well.
and battles...

## White mode

Fix white mode, noone uses it but if someone does - they should be able to use it without it looking like a complete mess.
- admin panel
- settings
- advanced search
- stats
- character / corporation / alliance pages

## Mobile

Fix mobile, it has a lot of errors all over the place, like language translation blocks in ships (invType) showing up instead of the actual word translated to the correct language the site should be showing.

## Compile docs into the source code, instad of copying in the files

Use nuxt mdcs or somesuch for it, to compile the docs into the source code.

## Fix the killlist websocket pause

It seems the killlist pause is kinda broken, because it disconnects instead of stays connected and batching up data.
Also remove the indicator that it paused, just do it without letting the user know.

## Add groups page

To show ships in the group (or items) and what the group description is

## Custom killboard links

Allow people to cname their own domain to eve-kill.com - and then depending on the domain, send them to the page they have configured in settings.
This will allow them to get corporation/alliance/custom killboards back in a sense.

This will require adding campaigns for the character, corporation, alliance as a tab as well (So when they make a campaign, it'll show up for the entity involved if the campaign is public)

(Remember to add multi type to custom domains as well, so a player can have himself and his 10 buddies added to a url)
(Allow upto 10 domains pr. user)
(Remove the visit counting and such, same with rate limit - it's not needed)
(Make a custom page for the char/corp/alli/combi? page that is their entry into the site (If you want to) - otherwise just show the normal page)
(Allow users to add a banner image)
(Allow users to overwrite CSS values)
(Allow users to customize the navbar at the top with their own links)
(Add a few components like campaign, battles, stats, advanced search, etc. that they can add to their custom page)
