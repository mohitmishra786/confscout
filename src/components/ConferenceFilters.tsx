'use client';

import { useState, ChangeEvent } from 'react';
import type { ConferenceFilters } from '@/types/conference';
import { SlidersHorizontal, Calendar, MapPin, DollarSign, Shield, X } from 'lucide-react';

interface ConferenceFiltersProps {
  filters: ConferenceFilters;
  onFiltersChange: (filters: ConferenceFilters) => void;
  totalResults: number;
}

export default function ConferenceFilters({ filters, onFiltersChange, totalResults }: ConferenceFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof ConferenceFilters, value: string | boolean | number | string[] | Record<string, unknown>) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleSelectChange = (key: keyof ConferenceFilters, e: ChangeEvent<HTMLSelectElement>) => {
    handleFilterChange(key, e.target.value);
  };

  const handleInputChange = (key: keyof ConferenceFilters, e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    handleFilterChange(key, value);
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      domain: 'all',
      cfpOpen: false,
      hasFinancialAid: false,
      online: false,
      entryFee: 'all'
    });
  };

  const activeFiltersCount = Object.values(filters).filter(v => 
    v !== undefined && v !== 'all' && v !== false && v !== ''
  ).length;

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {activeFiltersCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">{totalResults} results</span>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Domain</label>
          <select
            value={filters.domain || 'all'}
            onChange={(e) => handleSelectChange('domain', e)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Domains</option>
            <option value="ai">AI & ML</option>
            <option value="web">Web Development</option>
            <option value="security">Security</option>
            <option value="devops">DevOps</option>
            <option value="cloud">Cloud & Infrastructure</option>
            <option value="data">Data Engineering</option>
            <option value="mobile">Mobile Development</option>
            <option value="opensource">Open Source</option>
            <option value="academic">Academic</option>
            <option value="general">General</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">CFP Status</label>
          <select
            value={filters.cfpOpen ? 'open' : 'all'}
            onChange={(e) => handleFilterChange('cfpOpen', e.target.value === 'open')}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Conferences</option>
            <option value="open">Open CFPs Only</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Financial Aid</label>
          <select
            value={filters.hasFinancialAid ? 'available' : 'all'}
            onChange={(e) => handleFilterChange('hasFinancialAid', e.target.value === 'available')}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Conferences</option>
            <option value="available">Has Financial Aid</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Format</label>
          <select
            value={filters.online ? 'online' : 'all'}
            onChange={(e) => handleFilterChange('online', e.target.value === 'online')}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Formats</option>
            <option value="online">Online Only</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search conferences by name, location, or tags..."
          value={filters.searchTerm || ''}
          onChange={(e) => handleInputChange('searchTerm', e)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-6 pt-4 border-t border-zinc-800">
          {/* Date Range */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
              <Calendar className="w-4 h-4" />
              Date Range
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="date"
                  placeholder="Start date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...(filters.dateRange || { start: '', end: '' }),
                    start: e.target.value
                  })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  placeholder="End date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...(filters.dateRange || { start: '', end: '' }),
                    end: e.target.value
                  })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Location Filters */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
              <MapPin className="w-4 h-4" />
              Location
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={filters.location?.type || 'all'}
                onChange={(e) => handleFilterChange('location', {
                  ...(filters.location || { type: 'all' }),
                  type: e.target.value as 'all' | 'online' | 'country' | 'nearby'
                })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Locations</option>
                <option value="online">Online Only</option>
                <option value="country">Specific Countries</option>
              </select>
              
              {filters.location?.type === 'nearby' && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Radius (km)"
                    value={filters.location.radius || ''}
                    onChange={(e) => handleFilterChange('location', {
                      ...filters.location!,
                      radius: parseInt(e.target.value)
                    })}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-zinc-500 text-sm">km</span>
                </div>
              )}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
              <DollarSign className="w-4 h-4" />
              Budget / Entry Fee
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'free', 'low', 'medium', 'high'] as const).map((budget) => (
                <button
                  key={budget}
                  onClick={() => handleFilterChange('budget', budget)}
                  className={`px-4 py-2 rounded-lg capitalize ${
                    filters.budget === budget
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {budget === 'all' ? 'All Prices' : budget}
                </button>
              ))}
            </div>
          </div>

          {/* Conference Type */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
              <Shield className="w-4 h-4" />
              Conference Type
            </label>
            <div className="flex flex-wrap gap-2">
              {['academic', 'industry', 'community', 'workshop'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    const currentTypes = filters.conferenceType || [];
                    const newTypes = currentTypes.includes(type)
                      ? currentTypes.filter(t => t !== type)
                      : [...currentTypes, type];
                    handleFilterChange('conferenceType', newTypes);
                  }}
                  className={`px-4 py-2 rounded-lg capitalize ${
                    filters.conferenceType?.includes(type)
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-2 block">Sort By</label>
            <select
              value={filters.sortBy || 'date'}
              onChange={(e) => handleFilterChange('sortBy', e.target.value as 'date' | 'cfpDeadline' | 'relevance' | 'rating')}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="date">Start Date</option>
              <option value="cfpDeadline">CFP Deadline</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}