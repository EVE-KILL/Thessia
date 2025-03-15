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
            title,
            author: postData.author,
            score: postData.score,
            createdAt: postData.created_utc * 1000
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
                title,
                author: postData.author,
                score: postData.score,
                createdAt: postData.created_utc * 1000
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
 * Fetch random image from a subreddit
 */
export async function getRandomSubredditImage(subreddit: string): Promise<RedditPostInfo | null> {
  try {
    // Use the JSON API to get top posts from the subreddit
    const url = `https://www.reddit.com/r/${subreddit}/top.json?sort=top&t=month&limit=25`

    // Fetch with a user agent to avoid 429 errors
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EVE-KILL/1.0 (https://eve-kill.net)'
      }
    })

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data?.data?.children || !Array.isArray(data.data.children)) {
      throw new Error('Invalid Reddit API response format')
    }

    // Filter posts to only include images (not videos or links)
    const imagePosts = data.data.children.filter(post => {
      const url = post.data?.url || ''
      const hint = post.data?.post_hint || ''

      // Check if it's an image by extension or hint
      return (
        hint === 'image' ||
        url.endsWith('.jpg') ||
        url.endsWith('.jpeg') ||
        url.endsWith('.png') ||
        url.endsWith('.gif') ||
        url.includes('i.imgur.com') ||
        url.includes('i.redd.it')
      )
    })

    if (imagePosts.length === 0) {
      return null
    }

    // Select a random post from the filtered list
    const randomPost = imagePosts[Math.floor(Math.random() * imagePosts.length)]
    const postData = randomPost.data

    // Create a normalized post info object
    return {
      title: postData.title,
      permalink: `https://www.reddit.com${postData.permalink}`,
      imageUrl: postData.url,
      author: postData.author,
      score: postData.score,
      createdAt: postData.created_utc * 1000 // Convert to milliseconds
    }
  } catch (error) {
    console.error(`Error fetching from Reddit r/${subreddit}:`, error)
    return null
  }
}
