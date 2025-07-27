# Auth API

## `GET /api/auth/loginurl`

**Description:** Generates an EVE Online SSO login URL. This URL is used to initiate the OAuth 2.0 flow for user authentication.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:**
    *   `redirect`: (Optional) The URL to redirect the user to after successful authentication.
    *   `scopes`: (Optional) A comma-separated string of EVE SSO scopes to request. If not provided, default scopes (`publicData`, `esi-killmails.read_killmails.v1`, `esi-killmails.read_corporation_killmails.v1`) are used. `publicData` is always included.
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// Get login URL with default scopes and no specific redirect
// const dataDefault = await $fetch('/api/auth/loginurl');

// Get login URL with custom scopes and a redirect
// const customScopes = 'esi-calendar.read_calendar_events.v1,esi-characters.read_corporation_roles.v1';
// const redirectUrl = '/user/dashboard';
// const dataCustom = await $fetch(`/api/auth/loginurl?scopes=${encodeURIComponent(customScopes)}&redirect=${encodeURIComponent(redirectUrl)}`);
```

**Example Response (Conceptual):**
```json
{
  "url": "https://login.eveonline.com/v2/oauth/authorize?response_type=code&client_id=YOUR_EVE_CLIENT_ID&redirect_uri=YOUR_CALLBACK_URL&scope=publicData%20esi-killmails.read_killmails.v1%20esi-killmails.read_corporation_killmails.v1&state=GENERATED_STATE_STRING"
}

## `POST /api/auth/logout`

**Description:** Logs out the current user by clearing the authentication cookie.

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const response = await $fetch('/api/auth/logout', { method: 'POST' });
```

**Example Response (Conceptual):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
// Or on failure:
// {
//   "success": false,
//   "message": "An error occurred during logout"
// }
```

## `GET /api/auth/me`

**Description:** Retrieves information about the currently authenticated user. It checks for an authentication cookie, fetches user details from the database, and enriches it with data from ESI (character, corporation, alliance).

**Parameters:**
*   **Path Parameters:** None
*   **Query Parameters:** None
*   **Body Parameters:** None

**Example Request (Conceptual):**
```typescript
// const userData = await $fetch('/api/auth/me');
```

**Example Response (Conceptual - User Authenticated):**
```json
{
  "authenticated": true,
  "user": {
    "characterId": 90000001,
    "characterName": "CCP Player",
    "corporationId": 98000001,
    "corporationName": "Player Corporation",
    "allianceId": 99000001, // or 0 if not in an alliance
    "allianceName": "Player Alliance", // or "" if not in an alliance
    "scopes": ["publicData", "esi-killmails.read_killmails.v1"],
    "canFetchCorporationKillmails": true,
    "dateExpiration": "2025-12-31T23:59:59Z",
    "administrator": false,
    "createdAt": "2023-01-01T12:00:00Z",
    "lastChecked": "2023-10-27T10:00:00Z"
  }
}
```

**Example Response (Conceptual - User Not Authenticated or Error):**
```json
{
  "authenticated": false,
  "user": null
}
// Or, if ESI fetch fails but user is in DB:
// {
//   "authenticated": true,
//   "user": {
//     "characterId": 90000001,
//     "characterName": "CCP Player",
//     "corporationId": null,
//     "corporationName": null,
//     "allianceId": null,
//     "allianceName": null,
//     "scopes": ["publicData"],
//     "canFetchCorporationKillmails": false,
//     "dateExpiration": "2025-12-31T23:59:59Z",
//     "administrator": false,
//     "createdAt": "2023-01-01T12:00:00Z"
//   }
// }
```
