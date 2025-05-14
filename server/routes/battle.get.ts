import { defineEventHandler, sendRedirect } from 'h3';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { killmail } = query;

  if (killmail) {
    // If we have a killmail query parameter, use the battle/[id] page with the query parameter
    return sendRedirect(event, `/battle/${killmail}?killmail=true`, 302);
  } else {
    // Otherwise redirect to the battles list page
    return sendRedirect(event, '/battles', 302);
  }
});
