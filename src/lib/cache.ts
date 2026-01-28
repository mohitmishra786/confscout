import { kv } from '@vercel/kv';
import { readFileSync } from 'fs';
import { join } from 'path';

const CACHE_KEY = 'conferences';
const CACHE_TTL = 3600; // 1 hour

export interface CachedData {
  data: any;
  timestamp: number;
}

export async function getCachedConferences(): Promise<any> {
  try {
    const cached = await kv.get<CachedData>(CACHE_KEY);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
      return cached.data;
    }
    
    // Cache miss or expired, load from file
    const filePath = join(process.cwd(), 'public/data/conferences.json');
    const fileData = readFileSync(filePath, 'utf8');
    const conferences = JSON.parse(fileData);
    
    // Update cache
    await kv.set(CACHE_KEY, {
      data: conferences,
      timestamp: Date.now()
    }, { ex: CACHE_TTL });
    
    return conferences;
  } catch (error) {
    console.error('Cache error, falling back to file:', error);
    
    // Fallback to file system
    try {
      const filePath = join(process.cwd(), 'public/data/conferences.json');
      const fileData = readFileSync(filePath, 'utf8');
      return JSON.parse(fileData);
    } catch (fileError) {
      console.error('Failed to load conferences from file:', fileError);
      throw fileError;
    }
  }
}

export async function invalidateCache(): Promise<void> {
  try {
    await kv.del(CACHE_KEY);
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
  }
}

export async function warmCache(): Promise<void> {
  try {
    await getCachedConferences();
  } catch (error) {
    console.error('Failed to warm cache:', error);
  }
}