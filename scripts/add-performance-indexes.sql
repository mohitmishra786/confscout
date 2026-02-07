-- Performance Optimization: Add missing database indexes
-- Run this script to improve query performance for conference filtering

-- Add index on cfpStatus for speaker mode filtering
CREATE INDEX IF NOT EXISTS "conferences_cfp_status_idx" ON "conferences"("cfp_status");

-- Add composite index on domain + startDate for faster filtered queries
CREATE INDEX IF NOT EXISTS "conferences_domain_start_date_idx" ON "conferences"("domain", "startDate");

-- Analyze tables to update query planner statistics
ANALYZE "conferences";
