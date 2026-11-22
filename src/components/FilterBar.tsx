import React, { useState } from 'react';
import {
  Search,
  Calendar,
  MapPin,
  Tag,
  LayoutGrid,
  List,
  X,
  Building2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from 'lucide-react';
import { ConcertSource } from '../types/concert';

export type DateFilterType = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week' | 'month' | 'custom';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedVenue: string;
  onSelectVenue: (venue: string) => void;
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  selectedSource: string;
  onSelectSource: (source: string) => void;
  sources: ConcertSource[];
  dateFilter: DateFilterType;
  onSelectDateFilter: (f: DateFilterType) => void;
  customDate: string;
  onSelectCustomDate: (d: string) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  citiesList: { city: string; count: number }[];
  viewMode: 'grid' | 'list';
  onToggleViewMode: (mode: 'grid' | 'list') => void;
  sortBy: 'date-asc' | 'date-desc' | 'newest';
  onSelectSortBy: (sort: 'date-asc' | 'date-desc' | 'newest') => void;
  venuesList: string[];
  popularVenuesForCity: string[];
  totalFiltered: number;
  onResetFilters: () => void;
}

const POPULAR_GENRES = [
  'Alle',
  'Punk',
  'Hardcore',
  'Crust / D-Beat',
  'Grindcore',
  'Oi! / Streetpunk',
  'Metal',
  'Post-Punk',
  'Doom / Sludge',
  'Emo / Screamo',
  'Ska-Punk',
  'DIY / Soli',
];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedVenue,
  onSelectVenue,
  selectedGenre,
  onSelectGenre,
  selectedSource,
  onSelectSource,
  sources,
  dateFilter,
  onSelectDateFilter,
  customDate,
  onSelectCustomDate,
  selectedCity,
  onSelectCity,
  citiesList,
  viewMode,
  onToggleViewMode,
  sortBy,
  onSelectSortBy,
  venuesList,
  popularVenuesForCity,
  totalFiltered,
  onResetFilters,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedVenue !== 'all' ||
    selectedGenre !== 'Alle' ||
    selectedSource !== 'all' ||
    dateFilter !== 'all' ||
    selectedCity !== 'all';

  const activeSummaryParts: string[] = [];
  if (selectedCity !== 'all') activeSummaryParts.push(selectedCity);
  if (selectedGenre !== 'Alle') activeSummaryParts.push(selectedGenre);
  if (selectedVenue !== 'all') activeSummaryParts.push(selectedVenue);
  if (dateFilter !== 'all') activeSummaryParts.push(dateFilter === 'custom' && customDate ? customDate : dateFilter);
  if (searchQuery.trim()) activeSummaryParts.push(`"${searchQuery.trim()}"`);

  // Top cities for 1-click switching
  const quickCities = citiesList.slice(0, 7);

  return (
    <div className="bg-[#151515] border border-[#2a2a2a] rounded-xl mb-6 overflow-hidden">
      {/* Compact Always-Visible Toggle Header */}
      <div
        onClick={() => setIsExpanded(prev => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(prev => !prev);
          }
        }}
        className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-[#1b1b1b] transition-colors"
      >
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-white uppercase tracking-wide">
            <SlidersHorizontal className="w-4 h-4 text-[#FF9000]" />
            <span>Suche, Filter &amp; Sortierung</span>
          </div>

          {activeSummaryParts.length > 0 && (
            <span className="text-[11px] font-mono text-[#FF9000] bg-[#FF9000]/10 border border-[#FF9000]/30 px-2 py-0.5 rounded">
              {activeSummaryParts.join(' · ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto text-xs">
          <span className="text-neutral-400 font-mono hidden sm:inline">
            <strong className="text-white">{totalFiltered}</strong> Konzerte
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onResetFilters();
              }}
              className="flex items-center gap-1 text-xs text-[#FF9000] hover:text-[#FFA31A] underline underline-offset-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Zurücksetzen</span>
            </button>
          )}

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(prev => !prev);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-black border border-[#2e2e2e] hover:border-[#FF9000]/60 text-neutral-200 hover:text-[#FF9000] font-semibold transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Einklappen' : 'Aufklappen'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Body */}
      {isExpanded && (
        <div className="p-4 pt-3 border-t border-[#242424] space-y-4">
          {/* 1. Main Search Row + Sort + View Mode */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Band, Veranstaltungsort, Stadt, Straße, Soli-Zweck..."
                className="w-full pl-10 pr-9 py-2 bg-black border border-[#2e2e2e] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF9000] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
                  aria-label="Suche leeren"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort & View Mode Toggle */}
            <div className="flex items-center gap-2 shrink-0 justify-end">
              <div className="flex items-center gap-1.5 bg-black px-2.5 py-1 rounded-lg border border-[#2e2e2e]">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#FF9000]" />
                <select
                  value={sortBy}
                  onChange={e => onSelectSortBy(e.target.value as 'date-asc' | 'date-desc' | 'newest')}
                  aria-label="Sortierung wählen"
                  className="text-xs bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  <option value="date-asc" className="bg-[#1b1b1b] text-white">Nächste Termine zuerst</option>
                  <option value="date-desc" className="bg-[#1b1b1b] text-white">Spätere Termine zuerst</option>
                  <option value="newest" className="bg-[#1b1b1b] text-white">Zuletzt entdeckt (Neu!)</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-[#2e2e2e]">
                <button
                  onClick={() => onToggleViewMode('grid')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[#FF9000] text-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Flyer-Rasteransicht"
                  aria-label="Rasteransicht"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onToggleViewMode('list')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-[#FF9000] text-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Konzert-Listenansicht"
                  aria-label="Listenansicht"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. City Switcher Row (Dropdown + Quick-Select Cities) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1 mr-1">
              <Building2 className="w-3.5 h-3.5 text-[#FF9000]" />
              <span>Stadt:</span>
            </span>

            {/* All Cities Dropdown */}
            <select
              value={selectedCity}
              onChange={e => onSelectCity(e.target.value)}
              aria-label="Alle Städte durchsuchen"
              className={`text-xs px-2.5 py-1.5 rounded-md border focus:outline-none focus:border-[#FF9000] cursor-pointer font-medium ${
                selectedCity !== 'all'
                  ? 'bg-black border-[#FF9000] text-[#FF9000]'
                  : 'bg-black border-[#2e2e2e] text-white'
              }`}
            >
              <option value="all" className="bg-[#1b1b1b] text-white">
                Alle Städte ({citiesList.length})
              </option>
              {citiesList.map(c => (
                <option key={c.city} value={c.city} className="bg-[#1b1b1b] text-white">
                  {c.city} ({c.count})
                </option>
              ))}
            </select>

            {/* Quick City Buttons */}
            <button
              onClick={() => onSelectCity('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedCity === 'all'
                  ? 'bg-[#FF9000] text-black font-bold'
                  : 'bg-black hover:bg-[#242424] text-neutral-300 border border-[#2e2e2e]'
              }`}
            >
              Alle Regionen
            </button>

            {quickCities.map(c => (
              <button
                key={c.city}
                onClick={() => onSelectCity(selectedCity === c.city ? 'all' : c.city)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCity.toLowerCase() === c.city.toLowerCase()
                    ? 'bg-[#FF9000] text-black font-bold'
                    : 'bg-black hover:bg-[#242424] text-neutral-300 border border-[#2e2e2e]'
                }`}
              >
                {c.city}
              </button>
            ))}
          </div>

          {/* 3. Date Segmented Controls */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1 mr-2">
              <Calendar className="w-3.5 h-3.5 text-[#FF9000]" />
              <span>Tag:</span>
            </span>

            {[
              { key: 'all', label: 'Alle Termine' },
              { key: 'today', label: 'Heute' },
              { key: 'tomorrow', label: 'Morgen' },
              { key: 'weekend', label: 'Dieses Wochenende' },
              { key: 'week', label: 'Nächste 7 Tage' },
              { key: 'month', label: 'Dieser Monat' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => onSelectDateFilter(item.key as DateFilterType)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  dateFilter === item.key
                    ? 'bg-[#FF9000] text-black font-bold'
                    : 'bg-black hover:bg-[#242424] text-neutral-300 border border-[#2e2e2e]'
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Custom Date Input */}
            <div className="flex items-center gap-1.5 ml-auto">
              <input
                type="date"
                value={customDate}
                onChange={e => {
                  onSelectCustomDate(e.target.value);
                  onSelectDateFilter('custom');
                }}
                className={`text-xs px-2.5 py-1 rounded bg-black border text-neutral-200 focus:outline-none focus:border-[#FF9000] cursor-pointer ${
                  dateFilter === 'custom' ? 'border-[#FF9000] text-[#FF9000] font-bold' : 'border-[#2e2e2e]'
                }`}
                title="Eigenes Datum wählen"
              />
            </div>
          </div>

          {/* 4. Genre Quick Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1 mr-2">
              <Tag className="w-3.5 h-3.5 text-[#FF9000]" />
              <span>Genre:</span>
            </span>

            {POPULAR_GENRES.map(g => (
              <button
                key={g}
                onClick={() => onSelectGenre(g)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  selectedGenre === g
                    ? 'bg-[#FF9000] text-black font-bold'
                    : 'bg-black hover:bg-[#242424] text-neutral-400 hover:text-white border border-[#2e2e2e]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* 5. Venue & Source Dropdowns & Quick Chips + Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#262626]">
            <div className="flex flex-wrap items-center gap-2">
              {/* Source Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-neutral-400">Quelle:</span>
                <select
                  value={selectedSource}
                  onChange={e => onSelectSource(e.target.value)}
                  className="text-xs px-2.5 py-1 bg-black border border-[#2e2e2e] rounded text-white focus:outline-none focus:border-[#FF9000] cursor-pointer"
                >
                  <option value="all">Alle Quellen ({sources.length})</option>
                  {sources.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-neutral-700 hidden sm:inline" aria-hidden="true">|</span>

              {/* Venue Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#FF9000]" />
                  <span>Venue:</span>
                </span>

                <select
                  value={selectedVenue}
                  onChange={e => onSelectVenue(e.target.value)}
                  className="text-xs px-2.5 py-1 bg-black border border-[#2e2e2e] rounded text-white focus:outline-none focus:border-[#FF9000] cursor-pointer max-w-[210px]"
                >
                  <option value="all">Alle Orte ({venuesList.length})</option>
                  {venuesList.slice(0, 100).map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic quick chips for top venues in the selected city */}
              {popularVenuesForCity.length > 0 && (
                <div className="hidden lg:flex items-center gap-1 ml-2">
                  {popularVenuesForCity.map(pv => (
                    <button
                      key={pv}
                      onClick={() => onSelectVenue(selectedVenue === pv ? 'all' : pv)}
                      className={`text-[11px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        selectedVenue.toLowerCase() === pv.toLowerCase()
                          ? 'bg-[#FF9000]/20 text-[#FF9000] border border-[#FF9000]/50 font-semibold'
                          : 'bg-black text-neutral-400 hover:text-white border border-[#2e2e2e]'
                      }`}
                    >
                      {pv}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results Counter & Reset Filter */}
            <div className="flex items-center gap-3 text-xs ml-auto">
              <span className="text-neutral-400 font-mono">
                <strong className="text-white">{totalFiltered}</strong> Konzerte gefunden
              </span>

              {hasActiveFilters && (
                <button
                  onClick={onResetFilters}
                  className="flex items-center gap-1 text-xs text-[#FF9000] hover:text-[#FFA31A] underline underline-offset-2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Filter zurücksetzen</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
