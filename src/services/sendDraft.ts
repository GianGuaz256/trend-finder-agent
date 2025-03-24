import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

export async function sendDraft(draft_post: string) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN is not defined.");
    }
    
    if (!chatId) {
      throw new Error("TELEGRAM_CHAT_ID is not defined.");
    }

    // Format message for Telegram (replace Markdown with plain text)
    const formattedMessage = formatMessageForTelegram(draft_post);

    // Initialize Telegram bot
    const bot = new TelegramBot(botToken);
    
    // Send message to Telegram without markdown parsing
    await bot.sendMessage(chatId, formattedMessage, {
      parse_mode: undefined,
      disable_web_page_preview: true
    });

    return `Success sending draft to Telegram at ${new Date().toISOString()}`;
  } catch (error) {
    console.log("Error sending draft to Telegram");
    console.error(error);
    return `Error sending draft to Telegram: ${error}`;
  }
}

/**
 * Format message for Telegram by replacing Markdown with plain text formatting
 */
function formatMessageForTelegram(message: string): string {
  // Replace markdown headers with plain text and emojis
  let formatted = message.replace(/## (.*)/g, '\n $1 \n');
  
  // Replace bullet points with emoji bullets
  formatted = formatted.replace(/• /g, '• ');
  
  // Replace markdown separators with plain text separators
  formatted = formatted.replace(/---/g, '\n⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯⋯\n');
  
  // Replace category tags with emoji style
  formatted = formatted.replace(/\[(.*?)\]/g, '[$1]');
  
  return formatted;
} 