import dotenv from "dotenv";

dotenv.config();

// Define source types
export type Source = {
  identifier: string;
  type: 'website' | 'twitter_user' | 'twitter_search' | 'newsletter';
};

export async function getCronSources(): Promise<Source[]> {
  try {
    console.log("Fetching sources...");

    // Check for required API keys
    const hasApifyKey = !!process.env.APIFY_API_TOKEN;
    const hasFirecrawlKey = !!process.env.FIRECRAWL_API_KEY;
    const xUsernames = process.env.X_USERNAMES?.split(',') || [];

    // Define sources based on available API keys
    const sources: Source[] = [
      ...(hasFirecrawlKey
        ? [
            { identifier: "https://bitcoinmagazine.com/", type: 'website' as const },
            { identifier: "https://www.ledgerinsights.com/", type: 'website' as const },
            { identifier: "https://www.theblock.co/", type: 'website' as const },
            { identifier: "https://bitcoinops.org/en/newsletters/", type: 'newsletter' as const }
          ] as Source[]
        : []),
      // ...(hasApifyKey && xUsernames.length > 0
      //   ? xUsernames.map(username => ({ 
      //       identifier: username.trim(), 
      //       type: 'twitter_user' as const 
      //     })) as Source[]
      //   : []),
    ];

    // Add stablecoin search term if Apify is available
    // if (hasApifyKey) {
    //   sources.push({
    //     identifier: 'stablecoin',
    //     type: 'twitter_search' as const
    //   });
    // }

    return sources;
  } catch (error) {
    console.error(error);
    return [];
  }
} 