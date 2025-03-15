/**
 * Utility functions for fetching images from Reddit
 */

/**
 * Type definition for Reddit post info
 */
export interface RedditPostInfo {
  imageUrl: string;
  permalink: string;
  title: string;
}

/**
 * Fetches image posts from a specified subreddit
 */
export async function fetchSubredditImages(subreddit: string, limit: number = 100): Promise<RedditPostInfo[]> {
  try {
    // Fetch JSON data from Reddit
    const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch from Reddit: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract image URLs and permalinks from posts
    const imageInfos: RedditPostInfo[] = [];

    if (data.data && data.data.children) {
      for (const post of data.data.children) {
        const postData = post.data;
        const permalink = `https://www.reddit.com${postData.permalink}`;
        const title = postData.title || 'Reddit Post';

        // Check if post has an image
        if (postData.url && isImageUrl(postData.url)) {
          imageInfos.push({
            imageUrl: postData.url,
            permalink,
            title
          });
        }
        // Handle gallery posts
        else if (postData.is_gallery && postData.media_metadata) {
          Object.keys(postData.media_metadata).forEach(key => {
            const media = postData.media_metadata[key];
            if (media.status === 'valid' && media.e === 'Image') {
              // Convert Reddit's weird image URLs to proper ones
              const imageId = media.id;
              const mimeType = media.m.split('/')[1];
              imageInfos.push({
                imageUrl: `https://i.redd.it/${imageId}.${mimeType}`,
                permalink,
                title
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
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  return imageExtensions.some(ext => url.toLowerCase().endsWith(ext)) ||
         url.includes('i.redd.it') ||
         url.includes('i.imgur.com');
}

/**
 * Gets a random image from the specified subreddit
 */
export async function getRandomSubredditImage(subreddit: string = 'eveporn'): Promise<RedditPostInfo | null> {
  const images = await fetchSubredditImages(subreddit);

  if (images.length === 0) {
    return null;
  }

  // Select a random image
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
}
