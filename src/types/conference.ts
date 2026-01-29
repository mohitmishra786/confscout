/**
 * Conference and Domain types for ConfScout v3.0
 *
 * Enhanced schema with month grouping, CFP focus, geocoding, and domain classification
 */

// Location with coordinates for world map
export interface ConferenceLocation {
  city: string;
  country: string;
  raw: string;
  lat?: number;
  lng?: number;
}

// Call for Proposals status
export interface CFPInfo {
  url: string;
  endDate: string | null;
  daysRemaining?: number;
  status?: 'open' | 'closed';
}

// Financial Aid info
export interface FinancialAidInfo {
  available: boolean;
  types?: string[];
  url?: string;
  notes?: string;
}

// Main conference type
export interface Conference {
  // Core identification  
  id: string;
  name: string;
  url: string;

  // Dates (ISO 8601 format: YYYY-MM-DD)
  startDate: string | null;
  endDate: string | null;

  // Location with geocoding
  location: ConferenceLocation;
  online: boolean;

  // Call for Proposals (CFP)
  cfp: CFPInfo | null;

  // Financial Aid
  financialAid?: FinancialAidInfo;

  // Domain classification
  domain: string;
  subDomains?: string[];
  tags?: string[];

  // Metadata
  description?: string;
  twitter?: string;

  // Source tracking
  source: string;
  sources?: string[]; // When merged from multiple sources

  // AI Enrichment
  recommendationReason?: string;
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