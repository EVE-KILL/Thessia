/**
 * Utility functions for fetching images from Reddit
 */

/**
 * Type definition for Reddit post info
 */
export interface RedditPostInfo {
  title: string;
  permalink: string;
  imageUrl: string;
  author: string;
  score: number;
  createdAt: number;
}

/**
 * Fetches image posts from a specified subreddit
 */
export async function fetchSubredditImages(
  subreddit: string,
  limit = 100,
): Promise<RedditPostInfo[]> {
  try {
    // Fetch JSON data from Reddit
    const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch from Reddit: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract image URLs and permalinks from posts
    const imageInfos: RedditPostInfo[] = [];

    if (data.data?.children) {
      for (const post of data.data.children) {
        const postData = post.data;
        const permalink = `https://www.reddit.com${postData.permalink}`;
        const title = postData.title || "Reddit Post";

        // Check if post has an image
        if (postData.url && isImageUrl(postData.url)) {
          imageInfos.push({
            imageUrl: postData.url,
            permalink,
            title,
            author: postData.author,
            score: postData.score,
            createdAt: postData.created_utc * 1000,
          });
        }
        // Handle gallery posts
        else if (postData.is_gallery && postData.media_metadata) {
          Object.keys(postData.media_metadata).forEach((key) => {
            const media = postData.media_metadata[key];
            if (media.status === "valid" && media.e === "Image") {
              // Convert Reddit's weird image URLs to proper ones
              const imageId = media.id;
              const mimeType = media.m.split("/")[1];
              imageInfos.push({
                imageUrl: `https://i.redd.it/${imageId}.${mimeType}`,
                permalink,
                title,
                author: postData.author,
                score: postData.score,
                createdAt: postData.created_utc * 1000,
              });
            }
          });
        }
      }
    }

    return imageInfos;
  } catch (error) {
    console.error("Error fetching Reddit images:", error);
    return [];
  }
}

/**
 * Helper to check if a URL is an image
 */
function isImageUrl(url: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  try {
    const parsedUrl = new URL(url);
    const allowedHosts = ["i.redd.it", "i.imgur.com"];
    return (
      imageExtensions.some((ext) => url.toLowerCase().endsWith(ext)) ||
      allowedHosts.includes(parsedUrl.host)
    );
  } catch (e) {
    return false;
  }
}

/**
 * Fetch random image from a subreddit
 */
export async function getRandomSubredditImage(subreddit: string): Promise<RedditPostInfo | null> {
  try {
    // Fetch up to 100 images from the subreddit using our existing function
    const images = await fetchSubredditImages(subreddit, 100);

    if (!images || images.length === 0) {
      console.debug(`No images found in r/${subreddit}`);
      return null;
    }

    // Select a truly random image from the array
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
  } catch (error) {
    console.debug(`Error getting random image from r/${subreddit}:`, error);
    return null;
  }
}
