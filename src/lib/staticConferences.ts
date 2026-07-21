import { readFile } from 'fs/promises';
import { join } from 'path';
import type { ConferenceData } from '@/types/conference';

/**
 * Shared reader for public/data/conferences.json with a short in-process
 * TTL cache. Route handlers previously re-read and re-parsed this ~2 MB
 * file on EVERY request (flagged by react-doctor as "static file read on
 * every request"). The file is rewritten at most once daily by the
 * ingestion workflow, so a 60-second TTL per server instance is safe.
 *
 * This is an intentional cross-request cache (not request-scoped state),
 * which is an allowed use of module-level state.
 */
let cache: { data: ConferenceData; timestamp: number } | null = null;
const TTL_MS = 60_000;

export async function readStaticConferences(): Promise<ConferenceData> {
  if (cache && Date.now() - cache.timestamp < TTL_MS) {
    return cache.data;
  }

  const filePath = join(process.cwd(), 'public/data/conferences.json');
  const fileData = await readFile(filePath, 'utf8');
  const data = JSON.parse(fileData) as ConferenceData;
  cache = { data, timestamp: Date.now() };
  return data;
}

/** Test hook: drop the in-process cache. */
export function _clearStaticConferencesCache(): void {
  cache = null;
}
