/**
 * Conference and Domain types for ConfScout v3.0
 *
 * Enhanced schema with month grouping, CFP focus, geocoding, and domain classification
 */

// Location with coordinates for world map
export interface ConferenceLocation {
  readonly city: string;
  readonly country: string;
  readonly raw: string;
  readonly lat?: number;
  readonly lng?: number;
}

// Call for Proposals status
export interface CFPInfo {
  readonly url: string;
  readonly endDate: string | null;
  readonly daysRemaining?: number;
  readonly status?: 'open' | 'closed';
}

// Financial Aid info
export interface FinancialAidInfo {
  readonly available: boolean;
  readonly types?: string[];
  readonly url?: string;
  readonly notes?: string;
}

// Main conference type
export interface Conference {
  // Core identification  
  readonly id: string;
  readonly name: string;
  readonly url: string;

  // Dates (ISO 8601 format: YYYY-MM-DD)
  readonly startDate: string | null;
  readonly endDate: string | null;

  // Location with geocoding
  readonly location: ConferenceLocation;
  readonly online: boolean;

  // Call for Proposals (CFP)
  readonly cfp: CFPInfo | null;

  // Financial Aid
  readonly financialAid?: FinancialAidInfo;

  // Domain classification
  readonly domain: string;
  readonly subDomains?: string[];
  readonly tags?: string[];

  // Metadata
  readonly description?: string;
  readonly twitter?: string;

  // Source tracking
  readonly source: string;
  readonly sources?: string[]; // When merged from multiple sources

  // AI Enrichment
  readonly recommendationReason?: string;

  // Community
  readonly attendeeCount?: number;
  readonly isAttending?: boolean;
  readonly attendees?: { readonly image: string | null; readonly name: string | null }[];
}

// Month-grouped conference data structure (matches JSON output)
export interface ConferenceData {
  lastUpdated: string;
  stats: ConferenceStats;
  months: Record<string, Conference[]>;
}

export interface ConferenceStats {
  total: number;
  withOpenCFP: number;
  withLocation: number;
  byDomain: Record<string, number>;
}

// Domain metadata for UI
export interface Domain {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  count: number;
}

// UI Filter options  
export interface ConferenceFilters {
  domain?: string;
  cfpOpen?: boolean;
  hasFinancialAid?: boolean;
  searchTerm?: string;
  country?: string;
  online?: boolean;
  entryFee?: 'free' | 'paid' | 'all';
  
  // Advanced filters
  dateRange?: {
    start: string;
    end: string;
  };
  location?: {
    type: 'nearby' | 'country' | 'online' | 'all';
    radius?: number; // km
    userLat?: number;
    userLng?: number;
    countries?: string[];
  };
  budget?: 'free' | 'low' | 'medium' | 'high' | 'all';
  attendance?: 'small' | 'medium' | 'large' | 'xl' | 'all';
  visaRequirements?: string[];
  organizerRating?: number;
  conferenceType?: string[];
  sortBy?: 'date' | 'cfpDeadline' | 'relevance' | 'rating';
}

// Sort options
export type SortOption = 'cfpDeadline' | 'startDate' | 'name';

// Domain metadata mapping
export const DOMAIN_INFO: Record<string, { name: string; icon: string; color: string }> = {
  ai: { name: 'AI / Machine Learning', icon: '🤖', color: '#8B5CF6' },
  software: { name: 'Software Engineering', icon: '⚙️', color: '#3B82F6' },
  security: { name: 'Security', icon: '🔒', color: '#EF4444' },
  web: { name: 'Web Development', icon: '🌐', color: '#10B981' },
  mobile: { name: 'Mobile', icon: '📱', color: '#F59E0B' },
  cloud: { name: 'Cloud / Infrastructure', icon: '☁️', color: '#06B6D4' },
  data: { name: 'Data / Databases', icon: '📊', color: '#EC4899' },
  devops: { name: 'DevOps / SRE', icon: '🔄', color: '#8B5CF6' },
  opensource: { name: 'Open Source', icon: '🔓', color: '#22C55E' },
  academic: { name: 'Academic / Research', icon: '🎓', color: '#6366F1' },
  general: { name: 'General', icon: '🎯', color: '#6B7280' },
};