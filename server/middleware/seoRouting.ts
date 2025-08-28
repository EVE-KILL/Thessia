import {
    defineEventHandler,
    getRequestHeader,
    getRequestURL,
    sendRedirect,
} from "h3";

/**
 * SEO routing middleware for custom domains
 * Handles sitemap.xml and robots.txt requests for custom domains
 */
export default defineEventHandler(async (event) => {
    const url = getRequestURL(event);
    const host = getRequestHeader(event, "host");

    if (!host) return;

    // Skip if this is the main domain
    if (
        host === "eve-kill.com" ||
        host === "localhost:3000" ||
        host.includes("localhost")
    ) {
        return;
    }

    const pathname = url.pathname;

    // Handle sitemap.xml requests
    if (pathname === "/sitemap.xml") {
        return sendRedirect(event, `/api/sitemap/${host}.xml`, 301);
    }

    // Handle robots.txt requests
    if (pathname === "/robots.txt") {
        return sendRedirect(event, `/api/robots/${host}.txt`, 301);
    }
});
