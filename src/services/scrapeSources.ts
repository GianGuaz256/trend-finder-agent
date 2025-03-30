import FirecrawlApp from "@mendable/firecrawl-js";
import { ApifyClient } from "apify-client";
import dotenv from "dotenv";
import { z } from "zod";
import { Source } from "./getCronSources";

dotenv.config();

// Initialize Firecrawl
const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// Initialize Apify
const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// 1. Define the schema for our expected JSON
const ArticleSchema = z.object({
  url: z.string().describe("URL of the article"),
  title: z.string().describe("Title of the article"),
});

const ArticlesSchema = z.object({
  articles: z
    .array(ArticleSchema)
    .max(3)
    .describe("A list of the 3 most recent articles"),
});

const StorySchema = z.object({
  headline: z.string().describe("Story or post headline"),
  link: z.string().describe("A link to the post or story"),
  date_posted: z.string().describe("The date the story or post was published"),
  content: z.string().optional().describe("Summary or content of the article"),
});

const StoriesSchema = z.object({
  stories: z
    .array(StorySchema)
    .describe("A list of today's crypto or blockchain-related stories"),
});

// Define the TypeScript types
type Article = z.infer<typeof ArticleSchema>;
type Story = z.infer<typeof StorySchema>;

/**
 * Scrape sources using Firecrawl (for websites) and Apify (for Twitter/X).
 * Returns a combined array of story objects.
 */
export async function scrapeSources(
  sources: Source[],
): Promise<Story[]> {
  // Initialize the stories array
  const combinedText: { stories: Story[] } = { stories: [] };

  // Configure toggles for scrapers
  const useScrape = true;
  const useTwitter = true;
  const tweetStartTime = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  for (const sourceObj of sources) {
    const source = sourceObj.identifier;
    const sourceType = sourceObj.type;

    // --- 1) Handle Twitter/X users with Apify ---
    if (sourceType === 'twitter_user') {
      if (useTwitter) {
        try {
          const username = source;
          console.log(`Fetching tweets for ${username} using Apify...`);

          // Run the Apify actor (tweet-scraper)
          console.log(`Calling Apify tweet-scraper with search term: from:${username}`);
          const run = await apifyClient.actor("apidojo/tweet-scraper").call({
            searchTerms: [`from:${username} since:${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`],
            maxItems: 50, 
            tweetLanguage: "en",
            sort: "Latest"
          });

          console.log(`Apify run ID: ${run.id}`);
          console.log(`Apify dataset ID: ${run.defaultDatasetId}`);

          // Get dataset items
          const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems({
            limit: 50  // Explicitly limit to 50 items when fetching from dataset
          });
          
          if (items.length === 0) {
            console.log(`No tweets found for username ${username}.`);
          } else {
            // Log sample tweet data to understand the structure
            console.log(`========== APIFY DATA FOR USER ${username} ==========`);
            console.log(`Found ${items.length} tweets from username ${username}`);
            if (items.length > 0) {
              console.log("First tweet sample data:");
              const sampleTweet = items[0] as Record<string, any>;
              // Log key fields from the tweet
              console.log({
                id: sampleTweet.id,
                url: sampleTweet.url,
                created_at: sampleTweet.created_at,
                username: sampleTweet.username,
                full_text: typeof sampleTweet.full_text === 'string' ? sampleTweet.full_text.substring(0, 100) + "..." : "No full text",
                text: typeof sampleTweet.text === 'string' ? sampleTweet.text.substring(0, 100) + "..." : "No text",
                favorite_count: sampleTweet.favorite_count,
                retweet_count: sampleTweet.retweet_count,
                reply_count: sampleTweet.reply_count,
                hashtags: sampleTweet.hashtags,
                media: Array.isArray(sampleTweet.media) ? `${sampleTweet.media.length} media items` : "No media"
              });
            }
            console.log(`================================================`);
            
            // Limit to 50 items even if more were returned
            const limitedItems = items.slice(0, 50);
            console.log(`Using ${limitedItems.length} tweets from username ${username} (limited to 50)`);
            
            // Check if we're getting demo/empty data (free tier limitation)
            const isDemoData = limitedItems.length > 0 && 
              (limitedItems[0].id === undefined || 
               limitedItems[0].url === undefined || 
               (!limitedItems[0].full_text && !limitedItems[0].text));
            
            if (isDemoData) {
              console.log(`WARNING: Received demo/empty data from Apify. This likely means you're on the free tier which can't use the API.`);
              console.log(`To get actual tweet data, you need to upgrade to a paid Apify plan.`);
            }
            
            // Map Apify tweet data to our Story schema, skip empty tweets
            const stories = limitedItems
              .filter(tweet => tweet.id !== undefined && (tweet.full_text || tweet.text))
              .map((tweet: any): Story => ({
                headline: `[${username} on X] ${tweet.full_text || tweet.text || "No text available"}`,
                link: tweet.url || `https://x.com/i/status/${tweet.id}`,
                date_posted: tweet.created_at || tweetStartTime,
              }));
            
            console.log(`After filtering, found ${stories.length} valid tweets from ${username}`);
            
            if (stories.length > 0) {
              combinedText.stories.push(...stories);
            } else if (isDemoData) {
              // Add a placeholder message if we're getting demo data
              combinedText.stories.push({
                headline: `[${username} on X] NOTE: Apify's free tier does not support API access - upgrade to paid plan to get actual tweets`,
                link: "https://apify.com/pricing",
                date_posted: new Date().toISOString()
              });
            }
          }
        } catch (error: any) {
          console.error(`Error fetching tweets with Apify:`, error);
        }
      }
    }
    // --- 2) Handle Twitter/X search terms with Apify ---
    else if (sourceType === 'twitter_search') {
      if (useTwitter) {
        try {
          const searchTerm = source;
          console.log(`Searching tweets for term "${searchTerm}" using Apify...`);

          // Run the Apify actor (tweet-scraper)
          console.log(`Calling Apify tweet-scraper with search term: ${searchTerm}`);
          const run = await apifyClient.actor("apidojo/tweet-scraper").call({
            searchTerms: [`${searchTerm} since:${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`],
            maxItems: 50,
            tweetLanguage: "en",
            sort: "Latest"
          });

          console.log(`Apify run ID: ${run.id}`);
          console.log(`Apify dataset ID: ${run.defaultDatasetId}`);

          // Get dataset items
          const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems({
            limit: 50  // Explicitly limit to 50 items when fetching from dataset
          });
          
          if (items.length === 0) {
            console.log(`No tweets found for search term "${searchTerm}".`);
          } else {
            // Log sample tweet data to understand the structure
            console.log(`========== APIFY DATA FOR SEARCH "${searchTerm}" ==========`);
            console.log(`Found ${items.length} tweets for search term "${searchTerm}"`);
            if (items.length > 0) {
              console.log("First tweet sample data:");
              const sampleTweet = items[0] as Record<string, any>;
              // Log key fields from the tweet
              console.log({
                id: sampleTweet.id,
                url: sampleTweet.url,
                created_at: sampleTweet.created_at,
                username: sampleTweet.username,
                full_text: typeof sampleTweet.full_text === 'string' ? sampleTweet.full_text.substring(0, 100) + "..." : "No full text",
                text: typeof sampleTweet.text === 'string' ? sampleTweet.text.substring(0, 100) + "..." : "No text",
                favorite_count: sampleTweet.favorite_count,
                retweet_count: sampleTweet.retweet_count,
                reply_count: sampleTweet.reply_count,
                hashtags: sampleTweet.hashtags,
                media: Array.isArray(sampleTweet.media) ? `${sampleTweet.media.length} media items` : "No media"
              });
            }
            console.log(`================================================`);
            
            // Limit to 50 items even if more were returned
            const limitedItems = items.slice(0, 50);
            console.log(`Using ${limitedItems.length} tweets for search term "${searchTerm}" (limited to 50)`);
            
            // Check if we're getting demo/empty data (free tier limitation)
            const isDemoData = limitedItems.length > 0 && 
              (limitedItems[0].id === undefined || 
               limitedItems[0].url === undefined || 
               (!limitedItems[0].full_text && !limitedItems[0].text));
            
            if (isDemoData) {
              console.log(`WARNING: Received demo/empty data from Apify. This likely means you're on the free tier which can't use the API.`);
              console.log(`To get actual tweet data, you need to upgrade to a paid Apify plan.`);
            }
            
            // Map Apify tweet data to our Story schema, skip empty tweets
            const stories = limitedItems
              .filter(tweet => tweet.id !== undefined && (tweet.full_text || tweet.text))
              .map((tweet: any): Story => ({
                headline: `[${searchTerm} trend on X] ${tweet.full_text || tweet.text || "No text available"}`,
                link: tweet.url || `https://x.com/i/status/${tweet.id}`,
                date_posted: tweet.created_at || tweetStartTime,
              }));
            
            console.log(`After filtering, found ${stories.length} valid tweets for search term "${searchTerm}"`);
            
            if (stories.length > 0) {
              combinedText.stories.push(...stories);
            } else if (isDemoData) {
              // Add a placeholder message if we're getting demo data
              combinedText.stories.push({
                headline: `[${searchTerm} trend on X] NOTE: Apify's free tier does not support API access - upgrade to paid plan to get actual tweets`,
                link: "https://apify.com/pricing",
                date_posted: new Date().toISOString()
              });
            }
          }
        } catch (error: any) {
          console.error(`Error searching tweets with Apify:`, error);
        }
      }
    }
    // --- 3) Handle website sources with Firecrawl using two-step approach ---
    else if (sourceType === 'website') {
      if (useScrape) {
        try {
          console.log(`Step 1: Extracting article structure from ${source}...`);
          
          // Step 1: Extract the main page structure and get top 3 articles
          const promptForMainPage = `
Extract the URLs, titles of the 3 most recent articles from this page.
Return ONLY a JSON object with the following structure:
{
  "articles": [
    {
      "url": "full URL to article 1",
      "title": "title of article 1"
    },
    {
      "url": "full URL to article 2",
      "title": "title of article 2"
    },
    {
      "url": "full URL to article 3",
      "title": "title of article 3"
    }
  ]
}
If a URL is relative, convert it to an absolute URL by prepending the base URL: ${source}
`;

          const mainPageResult = await app.extract([source], {
            prompt: promptForMainPage,
            schema: ArticlesSchema,
          });

          if (!mainPageResult.success) {
            throw new Error(`Failed to scrape main page: ${mainPageResult.error}`);
          }

          // Get the top 3 articles
          const articlesData = mainPageResult.data as { articles: Article[] };
          console.log(`Found ${articlesData.articles.length} articles from ${source}`);

          // Step 2: Extract detailed information from each article
          for (const article of articlesData.articles) {
            const articleUrl = article.url;
            console.log(`Step 2: Extracting content from ${articleUrl}...`);

            const promptForArticle = `
Extract the following information from this article:
1. Headline (the title of the article)
2. Publication date
3. A brief summary of the article content (100-200 words)

Return ONLY a JSON object with the following structure:
{
  "stories": [
    {
      "headline": "title of the article",
      "link": "${articleUrl}",
      "date_posted": "publication date (YYYY-MM-DD format if possible)",
      "content": "brief summary of article content"
    }
  ]
}
`;

            try {
              const articleResult = await app.extract([articleUrl], {
                prompt: promptForArticle,
                schema: StoriesSchema,
              });

              if (!articleResult.success) {
                console.error(`Failed to scrape article ${articleUrl}: ${articleResult.error}`);
                continue;
              }

              const articleData = articleResult.data as { stories: Story[] };
              if (articleData.stories.length > 0) {
                console.log(`Successfully extracted content from ${articleUrl}`);
                combinedText.stories.push(...articleData.stories);
              }
            } catch (articleError: any) {
              console.error(`Error scraping article ${articleUrl}:`, articleError);
            }
          }
        } catch (error: any) {
          if (error.statusCode === 429) {
            console.error(
              `Rate limit exceeded for ${source}. Skipping this source.`,
            );
          } else {
            console.error(`Error scraping source ${source}:`, error);
          }
        }
      }
    }
    // --- 4) Handle newsletter sources with Firecrawl ---
    else if (sourceType === 'newsletter') {
      if (useScrape) {
        try {
          console.log(`Extracting latest newsletter from ${source}...`);
          
          // Step 1: Extract the latest newsletter link
          const promptForNewsletterMain = `
Extract the URL, title, and date of the most recent newsletter from this page.
Return ONLY a JSON object with the following structure:
{
  "latestNewsletter": {
    "url": "full URL to the latest newsletter",
    "title": "title of the latest newsletter",
    "date": "publication date of the newsletter"
  }
}
If a URL is relative, convert it to an absolute URL by prepending the base URL: ${source}
`;

          const mainPageResult = await app.extract([source], {
            prompt: promptForNewsletterMain
          });

          if (!mainPageResult.success) {
            throw new Error(`Failed to scrape newsletter main page: ${mainPageResult.error}`);
          }

          // Get the latest newsletter URL
          const newsletterData = mainPageResult.data as any;
          if (!newsletterData.latestNewsletter || !newsletterData.latestNewsletter.url) {
            console.error(`Failed to extract latest newsletter URL from ${source}`);
            continue;
          }

          const latestNewsletterUrl = newsletterData.latestNewsletter.url;
          console.log(`Found latest newsletter: ${newsletterData.latestNewsletter.title} (${latestNewsletterUrl})`);

          // Step 2: Extract the content from the latest newsletter
          const promptForNewsletterContent = `
Extract the following information from this newsletter:
1. The title of the newsletter
2. The date of publication
3. A summary of the entire newsletter (250-350 words)
4. A detailed description of the first major topic/article in the newsletter (300-500 words)

Return ONLY a JSON object with the following structure:
{
  "stories": [
    {
      "headline": "Bitcoin Optech Newsletter #[NUMBER]: [TITLE]",
      "link": "${latestNewsletterUrl}",
      "date_posted": "publication date (YYYY-MM-DD format if possible)",
      "content": "Detailed description of the first major topic/article"
    }
  ]
}
`;

          try {
            const newsletterResult = await app.extract([latestNewsletterUrl], {
              prompt: promptForNewsletterContent,
              schema: StoriesSchema,
            });

            if (!newsletterResult.success) {
              console.error(`Failed to scrape newsletter content ${latestNewsletterUrl}: ${newsletterResult.error}`);
              continue;
            }

            const contentData = newsletterResult.data as { stories: Story[] };
            if (contentData.stories.length > 0) {
              console.log(`Successfully extracted content from ${latestNewsletterUrl}`);
              combinedText.stories.push(...contentData.stories);
            }
          } catch (newsletterError: any) {
            console.error(`Error scraping newsletter content ${latestNewsletterUrl}:`, newsletterError);
          }
        } catch (error: any) {
          if (error.statusCode === 429) {
            console.error(
              `Rate limit exceeded for ${source}. Skipping this source.`,
            );
          } else {
            console.error(`Error scraping source ${source}:`, error);
          }
        }
      }
    }
  }

  console.log(`Combined Stories: ${combinedText.stories.length} total stories found`);
  return combinedText.stories;
} 