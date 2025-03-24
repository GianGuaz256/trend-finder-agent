import { scrapeSources } from "../services/scrapeSources";
import { getCronSources } from "../services/getCronSources";
import { generateDraft } from "../services/generateDraft";
import { sendDraft } from "../services/sendDraft";

export const handleCron = async (): Promise<void> => {
  try {
    console.log("Starting trend finder process...");
    
    // Get sources to scrape
    const cronSources = await getCronSources();
    console.log(`Found ${cronSources.length} sources to process`);
    
    // Scrape all sources
    const rawStories = await scrapeSources(cronSources);
    console.log(`Scraped ${rawStories.length} stories/tweets from all sources`);
    
    // Convert to JSON string for AI processing
    const rawStoriesString = JSON.stringify(rawStories);
    console.log(`Raw stories string length: ${rawStoriesString.length} characters`);
    
    // Generate draft using AI
    const draftPost = await generateDraft(rawStoriesString);
    
    // Send the draft to Telegram
    const result = await sendDraft(draftPost!);
    console.log(result);
    
    console.log("Trend finder process completed successfully!");
  } catch (error) {
    console.error("Error in trend finder process:", error);
  }
}; 