import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

export default defineEventHandler(async (event) => {
    const path = getRouterParam(event, "path") || "";
    
    // Construct the full file path - use environment-aware path detection
    let sitemapsDir: string;
    
    if (process.env.THESSIA_CONTAINER) {
        // Production/Docker environment
        sitemapsDir = "/app/public/sitemaps";
    } else {
        // Development environment
        sitemapsDir = join(process.cwd(), "public", "sitemaps");
    }
    
    const filePath = join(sitemapsDir, path);
    
    // Security check: ensure the requested path is within the sitemaps directory
    if (!filePath.startsWith(sitemapsDir)) {
        throw createError({
            statusCode: 403,
            statusMessage: "Forbidden",
        });
    }
    
    // Check if file exists
    if (!existsSync(filePath)) {
        throw createError({
            statusCode: 404,
            statusMessage: "Sitemap not found",
        });
    }
    
    try {
        // Get file stats for headers
        const stats = await stat(filePath);
        
        // Read the file
        const fileContent = await readFile(filePath);
        
        // Set appropriate headers based on file extension
        const isCompressed = path.endsWith('.gz');
        const isXML = path.includes('.xml');
        
        setHeader(event, 'Content-Length', stats.size.toString());
        setHeader(event, 'Last-Modified', stats.mtime.toUTCString());
        setHeader(event, 'Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        
        if (isCompressed) {
            setHeader(event, 'Content-Encoding', 'gzip');
        }
        
        if (isXML) {
            setHeader(event, 'Content-Type', 'application/xml');
        } else {
            setHeader(event, 'Content-Type', 'application/octet-stream');
        }
        
        return fileContent;
        
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: "Error reading sitemap file",
        });
    }
});
