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
    const publicDir = path.resolve(process.cwd() + '/src/theme/' + theme + '/public/backgrounds');

    // Read the directory
    const files = await fs.promises.readdir(publicDir);

    // Filter for image files and format the response
    const backgrounds = files
      .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
      .map(file => ({
        path: `/backgrounds/${file}`
      }));

    return backgrounds;
});
