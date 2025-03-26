import fs from 'fs';
import path from 'path';
import { defineEventHandler } from 'h3';

/**
 * API endpoint to get all available background images
 *
 * @returns Array of background image objects
 */
export default defineEventHandler(async () => {
    const theme = process.env.THEME || 'modern';
    // Path to the public backgrounds directory
    const dirs = [
        path.join(process.cwd(), 'src', 'theme', theme, 'public', 'backgrounds'),
        path.join(process.cwd(), 'public', 'backgrounds'),
    ];

    // Find the first directory that exists
    let existingDir = null;
    for (const dir of dirs) {
        try {
            const stats = await fs.promises.stat(dir);
            if (stats.isDirectory()) {
                existingDir = dir;
                break;
            }
        } catch (error) {
            // Directory doesn't exist, try next one
            continue;
        }
    }

    // If no directory exists, return empty array
    if (!existingDir) {
        return [];
    }

    try {
        // Read the directory
        const files = await fs.promises.readdir(existingDir);

        // Filter for image files and format the response
        const backgrounds = files
            .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
            .map(file => ({
                path: `/backgrounds/${file}`
            }));

        return backgrounds;
    } catch (error) {
        console.error('Error reading backgrounds directory:', error);
        return [];
    }
});
