# Trend Finder 🔦

**Stay on top of trending topics in crypto and blockchain news — all in one place.**

Trend Finder collects and analyzes posts from key cryptocurrency sources and influencers, then sends a Telegram notification when it detects new trends or product launches. This is a game-changer for staying informed by:

- **Saving time** normally spent manually searching news sources
- **Keeping you informed** of relevant, real-time conversations
- **Enabling rapid response** to new opportunities or emerging industry shifts

_Spend less time hunting for trends and more time creating impactful strategies._

## How it Works

1. **Data Collection** 📥
   - **Website Scraping**: 
     - First extracts the structure of Bitcoin Magazine and Ledger Insights homepages
     - Then scrapes the first 3 articles from each site in detail, including content summaries
   - **Twitter/X Monitoring**:
     - Scrapes tweets from selected accounts (up to 50 tweets per user) using Apify's Tweet Scraper
     - Performs keyword searches for terms like "stablecoin" to find relevant discussions
   - Runs on a scheduled basis using cron jobs

2. **AI Analysis** 🧠
   - Processes collected content through Anthropic's Claude API
   - Identifies emerging trends and groups similar content together
   - Categorizes stories/tweets by topic (DeFi, Stablecoins, Bitcoin, etc.)
   - Analyzes sentiment and relevance

3. **Notification System** 📢
   - When significant trends are detected, sends formatted Telegram notifications
   - Provides trends grouped by theme with context and sources
   - Enables quick response to emerging opportunities

## Features

- 🤖 AI-powered trend analysis using Anthropic Claude
- 📱 Twitter/X monitoring via Apify's Tweet Scraper
- 🔍 Website monitoring with Firecrawl
- 💬 Instant Telegram notifications
- ⏱️ Scheduled monitoring using cron jobs

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Docker (optional)
- Docker Compose (optional)
- Telegram Bot token (get from BotFather)
- API keys for required services

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```
# Required: API key from Anthropic for trend analysis (https://www.anthropic.com/)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Required if monitoring web pages (https://www.firecrawl.dev/)
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# Required for Apify Tweet Scraper (https://apify.com)
APIFY_API_TOKEN=your_apify_api_token

# Required (Twitter/X accounts to monitor - comma-separated usernames without @)
X_USERNAMES=bitcoinmagazine,ledgerinsights

# Notification driver. Supported drivers: "telegram"
NOTIFICATION_DRIVER=telegram

# Required: Telegram bot token from BotFather
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Required: Telegram chat ID where messages will be sent
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone [repository-url]
   cd trend-finder
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application:**
   ```bash
   # Development mode with hot reloading
   npm run start

   # Build for production
   npm run build
   ```

## Docker Support

You can also run this application using Docker:

```bash
# Build and run with Docker Compose
docker-compose up --build -d

# Stop the application
docker-compose down
```

## Project Structure

```
trend-finder/
├── src/
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   └── index.ts        # Application entry point
├── .env.example        # Environment variables template
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
``` 