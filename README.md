# ConfScout - Tech Conference Tracker

ConfScout helps you discover upcoming tech conferences worldwide. Now with enhanced visualization and weekly updates.

Check it out: [https://www.confscout.site/](https://www.confscout.site/)

## 🚀 Key Features

*   **Interactive World Map**: Browse conferences on a beautiful dark-mode map with clustering and category-specific coloring.
*   **Smart Search & Filtering**: Filter by Domain (AI, Web, Mobile, etc.), Speaker Mode (Open CFPs), and Date timeline.
*   **Weekly Digests**: improved! Subscribe to get a curated list of upcoming conferences and closing CFPs delivered to your inbox via Zoho Mail.
*   **RSS Feed**: Subscribe via your favorite RSS reader at `/rss.xml`.
*   **Geospatial Discovery**: "Near Me" button to find events around your location.

## 🛠 Tech Stack

*   **Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript, Python (Data Scraping)
*   **Styling**: Tailwind CSS 4
*   **Map**: Leaflet, React Leaflet, CartoDB Dark Matter tiles
*   **Database**: Vercel Postgres (for subscriptions)
*   **Email**: Nodemailer + Zoho Mail
*   **RSS**: `feed` package

## 📦 Data Pipeline

1.  `scripts/fetch_confs.py`: Scrapes data from *confs.tech* (GitHub) and *Sessionize*.
2.  **Geocoding**: Uses `geopy` (Nominatim) to fetch coordinates for cities.
3.  **Output**: Generates `public/data/conferences.json` used by the frontend.

## 🔧 Setup & Environment Variables

To run this project locally, create a `.env` file with the following variables:

```bash
# Database (Vercel Postgres / Neon)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Email Service (Zoho)
ZOHO_EMAIL="admin@mohitmishra7.com"
ZOHO_PASSWORD="your-app-password"
ZOHO_USER="admin@mohitmishra7.com"

# App URL (For verification links)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Installation

```bash
# 1. Install Dependencies
npm install

# 2. Install Python Deps (for scraper)
pip install -r scripts/requirements.txt

# 3. Fetch Data (First time setup)
python3 scripts/fetch_confs.py

# 4. Initialize Database
node scripts/init_db.js

# 5. Run Dev Server
npm run dev
```

## 🔮 Future Enhancements

*   **User Accounts**: personalized profiles to save favorite conferences.
*   **Trip Planning**: Integration with Skyscanner/Hotels.com for travel estimates.
*   **Archives**: Access to past conference recordings.
*   **Reviews**: Community ratings and reviews for events.
