# Systems API

Currently, there are no dedicated API endpoints to fetch detailed information for a single solar system by its ID (e.g., `/api/systems/{system_id}`).

However, solar system information can be obtained through the following means:

*   **Search:** Solar systems can be found using the [Search API](./search.md) (e.g., `GET /api/search/{system_name}`).
*   **Stats API:** A list of top solar systems based on activity can be retrieved using the [Stats API](./stats.md) (e.g., `GET /api/stats?type=solarsystems`).
*   **Embedded Data:** System ID and name are often included as part of other data models, such as [Killmails](./killmails.md).

If specific endpoints for fetching individual solar system details are required, they would need to be implemented.
