/**
 * Search utilities for ConfScout v3.0
 *
 * Provides fuzzy search functionality using Fuse.js
 */

import Fuse from 'fuse.js';
import type { Conference, Domain } from '@/types/conference';

// Define SearchResult locally since it's not exported from types
interface SearchResult {
  domain: Domain;
  conferences: Conference[];
}

// Fuse.js configuration for fuzzy search
const fuseOptions = {
  keys: [
    { name: 'name', weight: 2 },
    { name: 'location.raw', weight: 1.5 },
    { name: 'tags', weight: 1 }
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 2
};

/**
 * Search conferences using fuzzy matching
 */
export function searchConferences(
  conferences: Conference[],
  searchTerm: string
): Conference[] {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return conferences;
  }

  const fuse = new Fuse(conferences, fuseOptions);
  const results = fuse.search(searchTerm.trim());

  return results.map(result => result.item);
}

/**
 * Search conferences grouped by domain
 */
export function searchConferencesByDomain(
  conferences: Conference[],
  domains: Domain[],
  searchTerm: string
): SearchResult[] {
  const filteredConferences = searchConferences(conferences, searchTerm);

  // Group by domain
  const domainMap = new Map<string, Conference[]>();

  for (const conf of filteredConferences) {
    const domainList = domainMap.get(conf.domain);
    if (domainList) {
      domainList.push(conf);
    } else {
      // Should not happen if logic above is correct
      domainMap.set(conf.domain, [conf]);
    }
  }

  // Create search results
  const results: SearchResult[] = [];

  for (const domain of domains) {
    const domainConferences = domainMap.get(domain.slug) || [];
    if (domainConferences.length > 0) {
      results.push({
        domain,
        conferences: domainConferences
      });
    }
  }

  return results;
}

/**
 * Highlight search term in text
 */
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm || !text) return text;

  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}