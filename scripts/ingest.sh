#!/bin/bash
set -e

echo "🚀 Starting Data Ingestion..."

# 1. Fetch data (Scrape)
echo "📦 Fetching conference data..."
python3 scripts/fetch_confs.py

# 2. Migrate/Load to DB
echo "💾 Loading data into Postgres..."
node scripts/migration/migrate_to_postgres.js

echo "✅ Ingestion Complete."