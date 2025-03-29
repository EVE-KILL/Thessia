import fs from "node:fs";
import path from "node:path";

/**
 * Downloads the Cloudflare beacon script, modifies it to use our proxy,
 * and saves it to the public directory.
 *
 * @param publicDir - The directory where the modified script should be saved
 * @returns Promise<void>
 */
export async function downloadAndModifyCloudflareBeacon(publicDir: string): Promise<void> {
  try {
    console.log("Downloading and processing Cloudflare beacon script...");
    const beaconUrl = "https://static.cloudflareinsights.com/beacon.min.js";

    // Fetch the original beacon script
    const response = await fetch(beaconUrl);

    if (!response.ok) {
      throw new Error(`Failed to download Cloudflare beacon: ${response.status}`);
    }

    let beaconScript = await response.text();

    // Replace the Cloudflare insights URL with our proxy endpoint
    beaconScript = beaconScript.replace(
      /https:\/\/cloudflareinsights\.com\/cdn-cgi\/rum/g,
      "/api/site/cloudflare/rumproxy",
    );

    // Ensure the _ca directory exists inside the publicDir
    const outputDir = path.join(publicDir, "_ca");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save the modified script
    const outputPath = path.join(outputDir, "cloudflare-beacon.js");
    fs.writeFileSync(outputPath, beaconScript);
    console.log(`Cloudflare beacon script saved to ${outputPath}`);
  } catch (error) {
    console.error("Failed to process Cloudflare beacon script:", error);
  }
}

/**
 * Hook function for Nuxt's nitro:build:public-assets hook
 *
 * @param nitro - The Nitro context passed by the hook
 */
export function generateCloudflareBeacon(nitro: any): void {
  // Execute the download and modification only during build time
  downloadAndModifyCloudflareBeacon(nitro.options.output.publicDir).catch((error) => {
    console.error("Error in generateCloudflareBeacon:", error);
  });
}
