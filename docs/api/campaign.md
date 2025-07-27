# Campaign API

## `GET /api/campaign`

**Description:** Retrieves a paginated list of public campaigns. Campaigns can be filtered by status (active, upcoming, completed) and searched by name or description. The response includes campaign details, calculated status, and counts of applied filters.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:**
    *   `page`: (Optional) The page number to retrieve (default: 1).
    *   `limit`: (Optional) The number of campaigns per page (default: 20, min: 1, max: 100).
    *   `status`: (Optional) Filter campaigns by status. Valid values: `active`, `upcoming`, `completed`.
    *   `search`: (Optional) A search term to filter campaigns by name or description (case-insensitive).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get the first page of active campaigns, default limit
// const activeCampaigns = await $fetch('/api/campaign?status=active');

// Get page 2 of campaigns matching "Omega Event", limit 10
// const searchResults = await $fetch('/api/campaign?search=Omega%20Event&page=2&limit=10');
```

**Example Response (Conceptual):**
```json
{
  "totalItems": 50,
  "totalPages": 3, // Assuming limit is 20
  "currentPage": 1,
  "itemsPerPage": 20,
  "campaigns": [
    {
      "campaign_id": "unique-campaign-id-123",
      "name": "Operation Blue Sky",
      "description": "A major offensive in nullsec.",
      "startTime": "2023-10-01T00:00:00Z",
      "endTime": "2023-11-01T00:00:00Z", // Can be null for ongoing campaigns
      "creator_id": 90000001,
      "public": true,
      "createdAt": "2023-09-15T10:00:00Z",
      "updatedAt": "2023-09-16T12:00:00Z",
      "query": { // The raw query object used for this campaign
        "region_id": [10000002],
        "attackers.alliance_id": [99000001]
      },
      "status": "completed", // Calculated: active, upcoming, or completed
      "filterCounts": { // Counts of entities in each filter category
        "locations": 1, // e.g., 1 region_id
        "attackers": 1, // e.g., 1 alliance_id
        "victims": 0
      }
    }
    // ... other campaigns
  ]
}
```

## `POST /api/campaign`

**Description:** Creates a new campaign or updates an existing one if `campaign_id` is provided in the body. Requires user authentication. Validates campaign data, including name, start/end times, and query filter limits.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:**
    *   `name`: (Required) String, the name of the campaign.
    *   `description`: (Optional) String, a description for the campaign.
    *   `startTime`: (Required) ISO 8601 string, the start time of the campaign.
    *   `endTime`: (Optional) ISO 8601 string, the end time of the campaign. If not provided, the campaign is considered ongoing.
    *   `query`: (Required) An object defining the filters for the campaign. Must contain at least one non-time filter.
        *   Supports fields like `region_id`, `system_id`, `constellation_id`, `attackers.character_id`, `attackers.corporation_id`, `attackers.alliance_id`, `attackers.faction_id`, `victim.character_id`, etc.
        *   These fields can be single values or an object with an `$in` array (e.g., `region_id: { $in: [10000002, 10000043] }`).
        *   **Entity Limits:**
            *   Location filters (`region_id`, `system_id`, `constellation_id`): Max 5 entities per field.
            *   Attacker/Victim entity filters (character, corporation, alliance, faction): Max 15 entities per field.
    *   `campaign_id`: (Optional) String. If provided, the endpoint will attempt to update the existing campaign with this ID. The authenticated user must be the creator of the campaign.
*   **Headers:**
    *   `Cookie`: Must contain `evelogin=TOKEN` where `TOKEN` is the user's authentication token.

**Example Request (Conceptual - Create New Campaign):**
```typescript
// const newCampaignData = {
//   name: "My New Nullsec Campaign",
//   description: "Tracking activity in specific nullsec regions.",
//   startTime: "2023-12-01T00:00:00Z",
//   endTime: "2024-01-01T00:00:00Z",
//   query: {
//     "region_id": { "$in": [10000002, 10000005] }, // Example: The Forge and Detorid
//     "attackers.alliance_id": [99000001]
//   }
// };

// const response = await $fetch('/api/campaign', {
//   method: 'POST',
//   body: newCampaignData,
//   // Headers will include the evelogin cookie managed by the browser/client
// });
```

**Example Request (Conceptual - Update Existing Campaign):**
```typescript
// const updateCampaignData = {
//   campaign_id: "existing-campaign-id-456",
//   name: "My Updated Nullsec Campaign",
//   description: "Updated objectives.",
//   startTime: "2023-12-01T00:00:00Z",
//   // endTime can be updated or removed
//   query: {
//     "region_id": [10000002], // Changed from array to single
//     "attackers.alliance_id": [99000001, 99000003] // Added another alliance
//   }
// };

// const response = await $fetch('/api/campaign', {
//   method: 'POST',
//   body: updateCampaignData
// });
```

**Example Response (Conceptual - Success Create/Update):**
```json
{
  "success": true,
  "message": "Campaign created successfully", // or "Campaign updated successfully"
  "campaign": {
    "id": "new-generated-campaign-id-789", // or the campaign_id that was updated
    "name": "My New Nullsec Campaign"
  }
}
```

**Example Response (Conceptual - Error):**
```json
// If authentication fails
// Status: 401
{
  "statusCode": 401,
  "statusMessage": "Authentication required" // or "Authentication failed"
  // ... other error details
}

// If validation fails (e.g., missing name, invalid dates, too many entities)
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Campaign name is required" // or "Too many entities for region_id. Maximum allowed is 5."
  // ... other error details
}

// If trying to update a campaign not owned by the user
// Status: 403
{
  "statusCode": 403,
  "statusMessage": "You are not authorized to update this campaign"
  // ... other error details
}

// If campaign_id for update not found
// Status: 404
{
  "statusCode": 404,
  "statusMessage": "Campaign not found"
  // ... other error details
}
```

## `POST /api/campaign/preview`

**Description:** Generates a statistics preview for a new or modified campaign without saving it. Requires user authentication. It takes campaign data (name, description, time, query filters) and returns calculated statistics based on those parameters.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:**
    *   `name`: (Required) String, the name of the campaign.
    *   `description`: (Optional) String, a description for the campaign.
    *   `startTime`: (Required) ISO 8601 string or Date object, the start time of the campaign.
    *   `endTime`: (Optional) ISO 8601 string or Date object, the end time of the campaign.
    *   `query`: (Required) An object defining the filters for the campaign. Must contain at least one non-time filter. (Same structure and limits as in `POST /api/campaign`).
*   **Headers:**
    *   `Cookie`: Must contain `evelogin=TOKEN` where `TOKEN` is the user's authentication token.

**Example Request (Conceptual):**
```typescript
// const campaignPreviewData = {
//   name: "Preview: Nullsec Incursion Response",
//   description: "Estimating impact of a potential operation.",
//   startTime: "2023-12-15T00:00:00Z",
//   query: {
//     "system_id": { "$in": [30000142, 30002187] }, // Jita & Amarr
//     "victim.alliance_id": [99000003] // Target alliance
//   }
// };

// const previewStats = await $fetch('/api/campaign/preview', {
//   method: 'POST',
//   body: campaignPreviewData,
//   // Headers will include the evelogin cookie
// });
```

**Example Response (Conceptual - Success):**
```json
// The response is an ICampaignOutput object
{
  "campaign_id": "preview-generateduniqueid", // A temporary ID for the preview
  "name": "Preview: Nullsec Incursion Response",
  "description": "Estimating impact of a potential operation.",
  "startTime": "2023-12-15T00:00:00.000Z",
  "endTime": null, // Or the specified end time
  "creator_id": 90000001, // Authenticated user's character ID
  "public": true,
  "stats": {
    "totalKills": 150,
    "totalLosses": 30, // Assuming 'losses' here means kills where a filter-matching entity was the victim
    "iskKilled": 10000000000, // 10 Billion ISK
    "iskLost": 2000000000,    // 2 Billion ISK
    "efficiency": 83.33,
    "balance": 8000000000,    // 8 Billion ISK
    "shipsKilled": 120,
    "shipsLost": 25,
    "topLists": {
      "attackers": {
        "alliances": [
          { "id": 99000001, "name": "Attacker Alliance A", "kills": 50, "iskKilled": 4000000000 }
        ],
        "corporations": [
          { "id": 98000001, "name": "Attacker Corp X", "kills": 20, "iskKilled": 1500000000 }
        ],
        "characters": [
          { "id": 90000002, "name": "Attacker Pilot Y", "kills": 5, "iskKilled": 500000000 }
        ]
      },
      "victims": { // Similarly structured for victims based on the query
        "alliances": [
          { "id": 99000003, "name": "Victim Alliance C (Target)", "losses": 20, "iskLost": 1500000000 }
        ],
        "corporations": [],
        "characters": []
      },
      "shipTypesKilled": [
        { "id": 670, "name": "Capsule", "count": 30, "value": 300000 }
      ],
      "shipTypesLost": [
        { "id": 587, "name": "Rifter", "count": 5, "value": 25000000 }
      ],
      "systems": [
        { "id": 30000142, "name": "Jita", "kills": 100, "losses": 10 }
      ],
      "regions": [
        { "id": 10000002, "name": "The Forge", "kills": 100, "losses": 10 }
      ]
    }
  },
  "killmails": [ /* Array of IKillmail objects matching the campaign query */ ],
  "updatedAt": "2023-10-27T12:30:00Z" // Time of preview generation
}
```

**Example Response (Conceptual - Error):**
```json
// If authentication fails
// Status: 401
{
  "statusCode": 401,
  "statusMessage": "Authentication required"
}

// If validation fails (e.g., missing name, invalid query)
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Campaign name is required" // or "Valid query object is required"
}

// If an internal error occurs during stat generation
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "Error generating campaign preview",
  "message": "Detailed error message if available"
}
```

## `GET /api/campaign/{id}`

**Description:** Retrieves detailed information about a specific campaign, including its base data and processed filter entities suitable for UI display.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The ID of the campaign to retrieve.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const campaignId = "unique-campaign-id-123";
// const campaignDetails = await $fetch(`/api/campaign/${campaignId}`);
```

**Example Response (Conceptual - Success):**
```json
{
  "campaign_id": "unique-campaign-id-123",
  "name": "Operation Blue Sky",
  "description": "A major offensive in nullsec.",
  "startTime": "2023-10-01T00:00:00.000Z",
  "endTime": "2023-11-01T00:00:00.000Z",
  "query": { // The raw query object used for this campaign
    "region_id": [10000002],
    "attackers.alliance_id": [99000001]
  },
  "creator_id": 90000001,
  "createdAt": "2023-09-15T10:00:00.000Z",
  "updatedAt": "2023-09-16T12:00:00.000Z",
  "public": true,
  "campaignQuery": { // Duplicate of 'query' for some reason
    "region_id": [10000002],
    "attackers.alliance_id": [99000001]
  },
  "filterEntities": { // Processed entities for UI display
    "locations": [
      { "id": 10000002, "name": "The Forge", "type": "region" }
    ],
    "attackers": [
      { "id": 99000001, "name": "Brave Collective", "type": "alliance" }
    ],
    "victims": []
  }
}
```

**Example Response (Conceptual - Error):**
```json
// If campaign ID is missing
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Campaign ID is required"
}

// If campaign not found
// Status: 404
{
  "statusCode": 404,
  "statusMessage": "Campaign not found"
}

// If internal server error
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "Error fetching campaign",
  "message": "Detailed error message if available"
}
```

## `GET /api/campaign/{id}/killmails`

**Description:** Retrieves a paginated list of killmails associated with a specific campaign, based on the campaign's defined query filters. Killmails are formatted for display in a kill list.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The ID of the campaign.
*   **Query Parameters:**
    *   `page`: (Optional) The page number to retrieve (default: 1).
    *   `limit`: (Optional) The number of killmails per page (default: 25, max: 1000).
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const campaignId = "unique-campaign-id-123";
// Get the first page of killmails for the campaign
// const killmailsPage1 = await $fetch(`/api/campaign/${campaignId}/killmails`);

// Get page 3 with 50 killmails per page
// const killmailsPage3Limit50 = await $fetch(`/api/campaign/${campaignId}/killmails?page=3&limit=50`);
```

**Example Response (Conceptual - Success):**
```json
{
  "killmails": [
    {
      "killmail_id": 123456789,
      "total_value": 150000000,
      "system_id": 30000142,
      "system_name": "Jita",
      "system_security": 0.9,
      "region_id": 10000002,
      "region_name": { "en": "The Forge" }, // Assuming i18n structure
      "kill_time": "2023-10-27T10:00:00.000Z",
      "attackerCount": 5,
      "commentCount": 0,
      "is_npc": false,
      "is_solo": false,
      "victim": {
        "ship_id": 670,
        "ship_name": { "en": "Capsule" },
        "character_id": 90000003,
        "character_name": "Victim Pilot",
        "corporation_id": 98000003,
        "corporation_name": "Victim Corp",
        "alliance_id": 99000003,
        "alliance_name": "Victim Alliance",
        "faction_id": 0,
        "faction_name": ""
      },
      "finalblow": {
        "character_id": 90000001,
        "character_name": "Attacker Pilot",
        "corporation_id": 98000001,
        "corporation_name": "Attacker Corp",
        "alliance_id": 99000001,
        "alliance_name": "Attacker Alliance",
        "faction_id": 0,
        "faction_name": "",
        "ship_name": { "en": "Rifter" },
        "ship_group_name": { "en": "Frigate" }
      }
    }
    // ... other formatted killmails
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "hasMore": true, // Indicates if there are more pages
    "total": 520 // Total number of killmails matching the campaign query
  }
}
```

**Example Response (Conceptual - Error):**
```json
// If campaign ID is missing
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Campaign ID is required"
}

// If campaign not found
// Status: 404
{
  "statusCode": 404,
  "statusMessage": "Campaign not found"
}

// If internal server error
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "Error fetching campaign killmails",
  "message": "Detailed error message if available"
}
```

## `GET /api/campaign/{id}/stats`

**Description:** Generates and retrieves comprehensive statistics for a specific campaign. This includes overall kill/loss counts, ISK values, efficiency, balance, top lists for various entities (alliances, corporations, characters, ship types, systems, regions), and the associated killmails.

**Parameters:**
*   **Path Parameters:**
    *   `{id}`: (Required) The ID of the campaign for which to generate stats.
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const campaignId = "unique-campaign-id-123";
// const campaignStats = await $fetch(`/api/campaign/${campaignId}/stats`);
```

**Example Response (Conceptual - Success):**
```json
// The response is an ICampaignOutput object, same as POST /api/campaign/preview
{
  "campaign_id": "unique-campaign-id-123",
  "name": "Operation Blue Sky",
  "description": "A major offensive in nullsec.",
  "startTime": "2023-10-01T00:00:00.000Z",
  "endTime": "2023-11-01T00:00:00.000Z",
  "creator_id": 90000001,
  "public": true,
  "stats": {
    "totalKills": 500,
    "totalLosses": 120,
    "iskKilled": 250000000000, // 250 Billion ISK
    "iskLost": 60000000000,    // 60 Billion ISK
    "efficiency": 80.64,
    "balance": 190000000000,   // 190 Billion ISK
    "shipsKilled": 450,
    "shipsLost": 100,
    "topLists": {
      "attackers": {
        "alliances": [
          { "id": 99000001, "name": "Brave Collective", "kills": 200, "iskKilled": 100000000000 }
          // ... other top attacker alliances
        ],
        "corporations": [ /* ... */ ],
        "characters": [ /* ... */ ]
      },
      "victims": {
        "alliances": [
          { "id": 99000002, "name": "Goonswarm Federation", "losses": 50, "iskLost": 30000000000 }
          // ... other top victim alliances
        ],
        "corporations": [ /* ... */ ],
        "characters": [ /* ... */ ]
      },
      "shipTypesKilled": [
        { "id": 33472, "name": "Praxis", "count": 50, "value": 12500000000 }
        // ... other top ship types killed
      ],
      "shipTypesLost": [
        { "id": 670, "name": "Capsule", "count": 80, "value": 800000 }
        // ... other top ship types lost
      ],
      "systems": [
        { "id": 30000142, "name": "Jita", "kills": 100, "losses": 10 }
        // ... other top systems
      ],
      "regions": [
        { "id": 10000002, "name": "The Forge", "kills": 150, "losses": 15 }
        // ... other top regions
      ]
    }
  },
  "killmails": [ /* Array of IKillmail objects matching the campaign query */ ],
  "updatedAt": "2023-11-02T10:00:00Z" // Time stats were last generated/updated
}
```

**Example Response (Conceptual - Error):**
```json
// If campaign ID is missing
// Status: 400
{
  "statusCode": 400,
  "statusMessage": "Campaign ID is required"
}

// If campaign not found (error forwarded from generateCampaignStats)
// Status: 404
{
  "statusCode": 404,
  "statusMessage": "Campaign not found"
}

// If internal server error during stat generation
// Status: 500
{
  "statusCode": 500,
  "statusMessage": "Error generating campaign statistics",
  "message": "Detailed error message if available"
}
```
