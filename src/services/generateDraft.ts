import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

/**
 * Generate a post draft with trending ideas based on raw stories and tweets.
 */
export async function generateDraft(rawStories: string) {
  console.log(
    `Generating a post draft with raw stories (${rawStories.length} characters)...`,
  );

  try {
    // Get current date for header
    const currentDate = new Date().toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      month: "numeric",
      day: "numeric",
    });

    // Define prompt
    const prompt = `
      You are given a list of raw crypto and blockchain-related stories sourced from websites and Twitter/X.
      Your task is to find interesting trends, launches, or unique insights from these sources.
      
      For each story or tweet, provide:
      1. A 'story_or_tweet_link' (the URL)
      2. A 'description' (a one-sentence summary that captures the key point)
      3. A 'category' that categorizes the content (e.g., "DeFi", "Stablecoins", "Bitcoin", "Regulation", etc.)
      
      Return at least 10 stories/tweets unless fewer are available.
      Group similar stories or tweets together under common themes or trends.
      
      Format the output strictly as JSON:
      {
        "trends": [
          {
            "trendName": "Name of the trend or theme",
            "items": [
              {
                "story_or_tweet_link": "https://...",
                "description": "One sentence description of the item",
                "category": "Category name"
              }
            ]
          }
        ]
      }

      Here are the raw stories and tweets:
      ${rawStories}
    `;

    // Initialize Claude client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Call Claude API
    const result = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract response
    const firstBlock = result.content[0];
    if (!firstBlock || firstBlock.type !== "text") {
      throw new Error("Invalid response format from Claude");
    }

    const rawJSON = firstBlock.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    if (!rawJSON) {
      console.log("No JSON output returned.");
      return "No output.";
    }

    console.log("Generated JSON response from Claude");
    const parsedResponse = JSON.parse(rawJSON);

    // Construct the final post with Telegram-friendly formatting
    const header = `🚀 Crypto & Blockchain Trends for ${currentDate}\n\n`;
    
    let draft_post = header;
    
    // Add each trend with its items
    parsedResponse.trends.forEach((trend: any, index: number) => {
      // Use different emojis based on trend content
      const trendEmoji = getTrendEmoji(trend.trendName.toLowerCase());
      draft_post += `${trendEmoji} ${trend.trendName.toUpperCase()} ${trendEmoji}\n\n`;
      
      trend.items.forEach((item: any) => {
        // Check if it's a long-form newsletter content
        if (item.content && item.content.length > 100) {
          // This is a newsletter article - format differently
          draft_post += `📰 [${item.category || 'Newsletter'}] ${item.description || item.headline}\n`;
          draft_post += `  ${item.link}\n\n`;
          draft_post += `${item.content.substring(0, 300)}...\n\n`;
          draft_post += `Read the full newsletter at: ${item.link}\n\n`;
        } else {
          // Regular news item
          draft_post += `• [${item.category}] ${item.description}\n  ${item.story_or_tweet_link || item.link}\n\n`;
        }
      });
      
      // Add separator between trends except after the last one
      if (index < parsedResponse.trends.length - 1) {
        draft_post += `⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️\n\n`;
      }
    });

    return draft_post;
  } catch (error) {
    console.error("Error generating draft post", error);
    return "Error generating draft post.";
  }
}

// Helper function to get appropriate emoji for trend
function getTrendEmoji(trendName: string): string {
  if (trendName.includes('bitcoin')) return '₿';
  if (trendName.includes('regulation')) return '📜';
  if (trendName.includes('tokenization')) return '🔗';
  if (trendName.includes('stablecoin')) return '💎';
  if (trendName.includes('blockchain')) return '⛓️';
  if (trendName.includes('defi')) return '🏦';
  if (trendName.includes('nft')) return '🎨';
  if (trendName.includes('gaming')) return '🎮';
  if (trendName.includes('metaverse')) return '🌐';
  if (trendName.includes('ai')) return '🤖';
  if (trendName.includes('newsletter')) return '📰';
  if (trendName.includes('development')) return '⚙️';
  if (trendName.includes('security')) return '🔒';
  if (trendName.includes('exchange')) return '💱';
  return '📈'; // default emoji
} 