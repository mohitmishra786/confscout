/**
 * Conference utilities for ConfScout v3.0
 *
 * Provides formatting and helper functions for conferences.
 */

import type { Conference } from '@/types/conference';

/**
 * Format a single date for display
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBD';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return 'TBD';
  if (!endDate) return formatDate(startDate);

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Same day
    if (startDate === endDate) {
      return formatDate(startDate);
    }

    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = end.getFullYear();

    // Same month
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    }

    // Different months
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  } catch {
    return `${startDate} - ${endDate}`;
  }
}

/**
 * Get location text for display
 */
export function getLocationText(conference: Conference): string {
  // Use the new location.raw field
  if (conference.location?.raw) {
    if (conference.online) {
      return `${conference.location.raw} (Hybrid)`;
    }
    return conference.location.raw;
  }

  if (conference.online) {
    return 'Online';
  }

  return 'Location TBD';
}

/**
 * Get days until conference starts
 */
export function getDaysUntilConference(startDate: string | null): number {
  if (!startDate) return -1;
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const diffTime = start.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if conference is happening soon (within 30 days)
 */
export function isHappeningSoon(startDate: string | null): boolean {
  if (!startDate) return false;
  const days = getDaysUntilConference(startDate);
  return days >= 0 && days <= 30;
}

/**
 * Get domain color
 */
export function getDomainColor(domain: string): string {
  const colors: Record<string, string> = {
    ai: '#8B5CF6',
    web: '#3B82F6',
    mobile: '#10B981',
    devops: '#F59E0B',
    security: '#EF4444',
    data: '#06B6D4',
    cloud: '#06B6D4',
    software: '#3B82F6',
    opensource: '#22C55E',
    academic: '#6366F1',
    general: '#6B7280'
  };

  return colors[domain] || '#6B7280';
}