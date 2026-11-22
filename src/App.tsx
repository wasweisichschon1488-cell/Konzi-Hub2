import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ConcertEvent, ConcertSource, ScanResult, NotificationRule } from './types/concert';
import { Header } from './components/Header';
import { ScannerBanner } from './components/ScannerBanner';
import { FilterBar, DateFilterType } from './components/FilterBar';
import { EventCard } from './components/EventCard';
import { EventListItem } from './components/EventListItem';
import { EventModal } from './components/EventModal';
import { NotificationModal } from './components/NotificationModal';
import { SourcesModal } from './components/SourcesModal';
import { AiScoutModal } from './components/AiScoutModal';
import { exportToIcs } from './utils/calendar';
import { playNotificationSound } from './utils/audio';
import { runClientSideScan } from './utils/clientScraper';
import { extractCitiesList, matchesCity, formatLocalDateIso } from './utils/cities';
import initialEventsData from './data/initialEvents.json';
import initialSourcesData from './data/initialSources.json';
import {
  getFavorites,
  toggleFavorite,
  getNotificationRules,
  saveNotificationRules,
  getUserSettings,
  saveUserSettings,
  getLastSeenTimestamp,
  updateLastSeenTimestamp,
} from './utils/storage';
import {
  Flame,
  Download,
  Loader2,
  MapPin,
} from 'lucide-react';

const BERLIN_ICONIC_VENUES = [
  'SO36',
  'Tommyhaus',
  'Köpi',
  'Supamolly',
  'Cassiopeia',
  'Schokoladen',
  'Clash',
  'Reset Club',
];

export default function App() {
  // State - initialized with bundled snapshot data for zero-latency instant display on any webspace
  const [events, setEvents] = useState<ConcertEvent[]>(initialEventsData as unknown as ConcertEvent[]);
  const [sources, setSources] = useState<ConcertSource[]>(initialSourcesData as unknown as ConcertSource[]);
  const [lastScan, setLastScan] = useState<ScanResult | null>({
    timestamp: new Date().toISOString(),
    totalEvents: (initialEventsData as unknown as ConcertEvent[]).length,
    newEventsCount: 0,
    sourcesScanned: (initialSourcesData as unknown as ConcertSource[]).length,
    sourceStats: (initialSourcesData as unknown as ConcertSource[]).map(s => ({
      sourceId: s.id,
      sourceName: s.name,
      count: s.eventCount || 0,
      status: s.status === 'error' ? 'error' : 'ok',
      durationMs: 120,
    })),
  });
  const [isScanning, setIsScanning] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  // Storage synced state
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // View & Filter state
  const [currentView, setCurrentView] = useState<'events' | 'favorites' | 'alerts' | 'sources'>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('Alle');
  const [selectedSource, setSelectedSource] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customDate, setCustomDate] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>(() => getUserSettings().cityFilterDefault || 'Berlin');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'newest'>('date-asc');
  const [visibleLimit, setVisibleLimit] = useState<number>(120);

  // Modals state
  const [selectedEventModal, setSelectedEventModal] = useState<ConcertEvent | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [isAiScoutModalOpen, setIsAiScoutModalOpen] = useState(false);

  // New events list for notification badges
  const [recentNewEvents, setRecentNewEvents] = useState<ConcertEvent[]>([]);

  // 1. Initial Load
  useEffect(() => {
    setFavorites(getFavorites());
    setNotificationRules(getNotificationRules());
    const settings = getUserSettings();
    setSoundEnabled(settings.soundEnabled);
    if (settings.cityFilterDefault) {
      setSelectedCity(settings.cityFilterDefault);
    }

    // Fetch Initial Data (Node.js API or static snapshot fallback)
    const loadData = async () => {
      try {
        const [evRes, srcRes, statusRes] = await Promise.allSettled([
          fetch('/api/events'),
          fetch('/api/sources'),
          fetch('/api/status'),
        ]);

        const isJson = (res: Response) =>
          res.ok && (res.headers.get('content-type') || '').includes('application/json');

        let backendWorked = false;
        if (evRes.status === 'fulfilled' && isJson(evRes.value)) {
          const evData = await evRes.value.json();
          if (evData.events && evData.events.length > 0) {
            setEvents(evData.events);
            backendWorked = true;
          }
        }

        if (srcRes.status === 'fulfilled' && isJson(srcRes.value)) {
          const srcData = await srcRes.value.json();
          if (Array.isArray(srcData) && srcData.length > 0) {
            setSources(srcData);
          }
        }

        if (statusRes.status === 'fulfilled' && isJson(statusRes.value)) {
          const statusData = await statusRes.value.json();
          if (statusData.lastScan) setLastScan(statusData.lastScan);
          setIsScanning(Boolean(statusData.isScanning));
        }

        // Static Webspace Fallback: If no backend API responded, load snapshot JSON if available
        if (!backendWorked) {
          try {
            const snapRes = await fetch('/events-snapshot.json');
            if (isJson(snapRes)) {
              const snap = await snapRes.json();
              if (Array.isArray(snap) && snap.length > 0) {
                setEvents(snap);
              }
            }
          } catch {
            // Already initialized with initialEventsData
          }
        }
      } catch (e) {
        console.warn('Backend nicht erreichbar, nutze lokale Snapshot-Daten:', e);
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, []);

  // 2. Trigger Scan Action (Node.js backend with automatic Client-Side CORS fallback)
  const handleTriggerScan = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      let scanHandled = false;

      // A: Try Node.js backend first
      try {
        const res = await fetch('/api/scan', { method: 'POST', signal: AbortSignal.timeout(20000) });
        const isJson = res.ok && (res.headers.get('content-type') || '').includes('application/json');
        if (isJson) {
          const scanResult: ScanResult = await res.json();
          setLastScan(scanResult);

          const [newEvRes, newSrcRes] = await Promise.all([
            fetch('/api/events'),
            fetch('/api/sources'),
          ]);

          if (newEvRes.ok && (newEvRes.headers.get('content-type') || '').includes('application/json')) {
            const data = await newEvRes.json();
            const updatedEvents: ConcertEvent[] = data.events || [];
            setEvents(updatedEvents);

            if (scanResult.newEventsCount > 0) {
              const lastSeen = getLastSeenTimestamp();
              const newlyDiscovered = updatedEvents.filter(
                ev => new Date(ev.firstSeenAt).getTime() >= new Date(lastSeen).getTime()
              );
              setRecentNewEvents(newlyDiscovered);
              updateLastSeenTimestamp();

              if (soundEnabled) playNotificationSound();
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('Konzi-Hub: Neue Konzerte!', {
                  body: `${scanResult.newEventsCount} neue Punk/Hardcore/Metal Termine entdeckt!`,
                  icon: '/favicon.svg',
                });
              }
            }
          }

          if (newSrcRes.ok && (newSrcRes.headers.get('content-type') || '').includes('application/json')) {
            const srcData = await newSrcRes.json();
            setSources(srcData || []);
          }

          scanHandled = true;
        }
      } catch {
        scanHandled = false;
      }

      // B: Client-side scanner fallback for static webspaces
      if (!scanHandled) {
        const clientResult = await runClientSideScan(sources, events);
        setLastScan(clientResult.scanResult);
        setEvents(clientResult.updatedEvents);
        setSources(clientResult.updatedSources);

        if (clientResult.scanResult.newEventsCount > 0) {
          if (soundEnabled) playNotificationSound();
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Konzi-Hub: Neue Termine!', {
              body: `${clientResult.scanResult.newEventsCount} neue Termine via Direkt-Scan gefunden!`,
              icon: '/favicon.svg',
            });
          }
        }
      }
    } catch (e: any) {
      console.error('Scan fehlgeschlagen:', e.message);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, soundEnabled, sources, events]);

  // 3. Favorites Handler
  const handleToggleFavorite = (eventId: string) => {
    toggleFavorite(eventId);
    setFavorites(getFavorites());
  };

  // 4. Save Notification Rules
  const handleSaveNotificationRules = (newRules: NotificationRule[]) => {
    setNotificationRules(newRules);
    saveNotificationRules(newRules);
  };

  // 5. Sound toggle
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    saveUserSettings({ ...getUserSettings(), soundEnabled: next });
    if (next) playNotificationSound();
  };

  // 6. City Selection Handler (persists choice & keeps venue consistent)
  const handleSelectCity = useCallback(
    (city: string) => {
      setSelectedCity(city);
      setSelectedVenue('all');
      saveUserSettings({ ...getUserSettings(), cityFilterDefault: city });
    },
    []
  );

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleLimit(120);
  }, [selectedCity, selectedVenue, selectedGenre, selectedSource, dateFilter, customDate, searchQuery, currentView]);

  // 7. Source Toggle
  const handleToggleSource = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      }).catch(() => {});
    } finally {
      setSources(prev => prev.map(s => (s.id === id ? { ...s, enabled } : s)));
    }
  };

  // 8. Add Custom Source
  const handleAddCustomSource = async (name: string, url: string, focus: string[]) => {
    try {
      const res = await fetch('/api/sources/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, focus }),
      });

      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const newSrc = await res.json();
        setSources(prev => [...prev, newSrc]);
        const evRes = await fetch('/api/events');
        if (evRes.ok) {
          const data = await evRes.json();
          setEvents(data.events || []);
        }
        return;
      }
    } catch {}

    const customSrc: ConcertSource = {
      id: `custom-${Date.now()}`,
      name,
      url,
      description: `Eigene Quelle: ${url}`,
      focus,
      type: url.includes('feed') || url.endsWith('.xml') ? 'rss' : 'html',
      enabled: true,
      status: 'online',
      lastScanned: new Date().toISOString(),
      eventCount: 0,
    };
    setSources(prev => [...prev, customSrc]);
  };

  // 9. Derived Cities List for City Switcher
  const citiesList = useMemo(() => extractCitiesList(events), [events]);

  // 10. Derived Venues List & Popular Venues scoped to Selected City
  const { venuesList, popularVenuesForCity } = useMemo(() => {
    const venueCounts = new Map<string, number>();
    for (const ev of events) {
      if (!matchesCity(ev.city, ev.address, selectedCity)) continue;
      if (ev.venue && ev.venue.trim()) {
        const v = ev.venue.trim();
        venueCounts.set(v, (venueCounts.get(v) || 0) + 1);
      }
    }

    const sortedAlpha = Array.from(venueCounts.keys()).sort((a, b) => a.localeCompare(b, 'de'));

    let popular: string[] = [];
    if (selectedCity.toLowerCase() === 'berlin') {
      popular = BERLIN_ICONIC_VENUES.filter(v =>
        sortedAlpha.some(sv => sv.toLowerCase().includes(v.toLowerCase()))
      );
      if (popular.length === 0) popular = BERLIN_ICONIC_VENUES.slice(0, 6);
    } else {
      popular = Array.from(venueCounts.entries())
        .filter(([name]) => !/^club\s*\/\s*(halle|diy|open)/i.test(name))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name]) => name);
    }

    return { venuesList: sortedAlpha, popularVenuesForCity: popular };
  }, [events, selectedCity]);

  // 11. Filter Logic
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Filter by view tab
    if (currentView === 'favorites') {
      result = result.filter(ev => favorites.includes(ev.id));
    } else if (currentView === 'alerts') {
      const enabledRules = notificationRules.filter(r => r.enabled);
      if (enabledRules.length > 0) {
        result = result.filter(ev => {
          return enabledRules.some(rule => {
            const kw = rule.keyword.toLowerCase().trim();
            if (rule.type === 'band') {
              return ev.bands.some(b => b.toLowerCase().includes(kw)) || ev.title.toLowerCase().includes(kw);
            }
            if (rule.type === 'venue') return ev.venue.toLowerCase().includes(kw);
            if (rule.type === 'genre') return ev.genres.some(g => g.toLowerCase().includes(kw));
            if (rule.type === 'city') return ev.city.toLowerCase().includes(kw);
            return false;
          });
        });
      }
    }

    // City Filter
    if (selectedCity !== 'all') {
      result = result.filter(ev => matchesCity(ev.city, ev.address, selectedCity));
    }

    // Venue Filter
    if (selectedVenue !== 'all') {
      result = result.filter(ev => ev.venue.toLowerCase().includes(selectedVenue.toLowerCase()));
    }

    // Source Filter
    if (selectedSource !== 'all') {
      result = result.filter(ev => ev.sourceId === selectedSource);
    }

    // Genre Filter
    if (selectedGenre !== 'Alle') {
      result = result.filter(ev => ev.genres.some(g => g.toLowerCase().includes(selectedGenre.toLowerCase())));
    }

    // Local Date Filter Math
    const now = new Date();
    const todayIso = formatLocalDateIso(now);

    if (dateFilter === 'today') {
      result = result.filter(ev => ev.date === todayIso);
    } else if (dateFilter === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      result = result.filter(ev => ev.date === formatLocalDateIso(tomorrow));
    } else if (dateFilter === 'weekend') {
      const day = now.getDay(); // 0 is Sunday, 5 is Friday
      const daysUntilFri = (5 - day + 7) % 7;
      const fri = new Date(now);
      fri.setDate(fri.getDate() + daysUntilFri);
      const sun = new Date(fri);
      sun.setDate(sun.getDate() + 2);
      const friIso = formatLocalDateIso(fri);
      const sunIso = formatLocalDateIso(sun);

      result = result.filter(ev => ev.date >= friIso && ev.date <= sunIso);
    } else if (dateFilter === 'week') {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      result = result.filter(ev => ev.date >= todayIso && ev.date <= formatLocalDateIso(nextWeek));
    } else if (dateFilter === 'month') {
      const yearMonth = todayIso.slice(0, 7);
      result = result.filter(ev => ev.date.startsWith(yearMonth));
    } else if (dateFilter === 'custom' && customDate) {
      result = result.filter(ev => ev.date === customDate);
    }

    // Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        ev =>
          ev.title.toLowerCase().includes(q) ||
          ev.venue.toLowerCase().includes(q) ||
          ev.city.toLowerCase().includes(q) ||
          ev.bands.some(b => b.toLowerCase().includes(q)) ||
          ev.address.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q) ||
          ev.genres.some(g => g.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'newest') return b.firstSeenAt.localeCompare(a.firstSeenAt);
      return 0;
    });

    return result;
  }, [
    events,
    currentView,
    favorites,
    notificationRules,
    selectedCity,
    selectedVenue,
    selectedGenre,
    selectedSource,
    dateFilter,
    customDate,
    searchQuery,
    sortBy,
  ]);

  // Export all favorited events into .ics
  const handleExportAllFavorites = () => {
    const favEvents = events.filter(ev => favorites.includes(ev.id));
    for (const ev of favEvents) {
      exportToIcs(ev);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedVenue('all');
    setSelectedGenre('Alle');
    setSelectedSource('all');
    setDateFilter('all');
    setCustomDate('');
    handleSelectCity('all');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col bg-poster-grid selection:bg-[#FF9000] selection:text-black">
      {/* 1. Header adhering to Top Bar Contract */}
      <Header
        currentView={currentView}
        onSelectView={view => {
          setCurrentView(view);
          if (view === 'alerts') setIsNotificationModalOpen(true);
          if (view === 'sources') setIsSourcesModalOpen(true);
        }}
        onTriggerScan={handleTriggerScan}
        isScanning={isScanning}
        favoritesCount={favorites.length}
        newMatchesCount={recentNewEvents.length}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenAiScout={() => setIsAiScoutModalOpen(true)}
        selectedCity={selectedCity}
        onSelectCity={handleSelectCity}
        citiesList={citiesList}
      />

      {/* 2. Scanner Banner & Metric Strip */}
      <ScannerBanner
        sources={sources}
        lastScan={lastScan}
        isScanning={isScanning}
        totalEvents={events.length}
        onOpenSourcesModal={() => setIsSourcesModalOpen(true)}
        onTriggerScan={handleTriggerScan}
      />

      {/* 3. Main Content Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* View Header / Title Banner */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono uppercase tracking-widest mb-1">
              <span>KONZI-HUB RADAR</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#FF9000] font-bold">PUNK · HARDCORE · METAL</span>
              {selectedCity !== 'all' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#FF9000]" />
                    {selectedCity}
                  </span>
                </>
              )}
            </div>

            <h1 className="font-display font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">
              {currentView === 'favorites'
                ? 'Deine gemerkten Konzerte'
                : currentView === 'alerts'
                ? 'Deine Such-Alarme & Treffer'
                : selectedCity === 'all'
                ? 'Alle Konzerttermine'
                : `Konzerte in ${selectedCity}`}
            </h1>
          </div>

          {/* Action button in header for specific views */}
          {currentView === 'favorites' && favorites.length > 0 && (
            <button
              onClick={handleExportAllFavorites}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b1b1b] hover:bg-[#262626] border border-[#2e2e2e] rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#FF9000]" />
              <span>Alle Favoriten (.ics) exportieren</span>
            </button>
          )}

          {(currentView === 'events' || currentView === 'sources') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-mono">Sortierung:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'date-asc' | 'date-desc' | 'newest')}
                className="text-xs bg-[#151515] border border-[#2e2e2e] rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-[#FF9000] cursor-pointer"
              >
                <option value="date-asc">Nächste Termine zuerst</option>
                <option value="date-desc">Spätere Termine zuerst</option>
                <option value="newest">Zuletzt entdeckt (Neu!)</option>
              </select>
            </div>
          )}
        </div>

        {/* 4. Filter Toolbar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedVenue={selectedVenue}
          onSelectVenue={setSelectedVenue}
          selectedGenre={selectedGenre}
          onSelectGenre={setSelectedGenre}
          selectedSource={selectedSource}
          onSelectSource={setSelectedSource}
          sources={sources}
          dateFilter={dateFilter}
          onSelectDateFilter={setDateFilter}
          customDate={customDate}
          onSelectCustomDate={setCustomDate}
          selectedCity={selectedCity}
          onSelectCity={handleSelectCity}
          citiesList={citiesList}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
          sortBy={sortBy}
          onSelectSortBy={setSortBy}
          venuesList={venuesList}
          popularVenuesForCity={popularVenuesForCity}
          totalFiltered={filteredEvents.length}
          onResetFilters={handleResetFilters}
        />

        {/* 5. Events Content Area */}
        {initialLoading ? (
          <div className="py-24 text-center space-y-4">
            <Loader2 className="w-8 h-8 text-[#FF9000] animate-spin mx-auto" />
            <p className="text-sm font-mono text-neutral-400">
              Checke Konzertquellen (Stressfaktor, Ask A Punk, Knox DB, Metal.de)...
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-20 text-center bg-[#151515] border border-[#2a2a2a] rounded-2xl p-8 max-w-xl mx-auto space-y-4">
            <Flame className="w-10 h-10 text-[#FF9000] mx-auto" />
            <h3 className="font-display font-bold text-2xl text-white">
              Keine Termine gefunden
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Für deine aktuellen Filterkriterien{selectedCity !== 'all' ? ` in ${selectedCity}` : ''} wurden keine Konzerte gefunden. Setze die Filter zurück, wähle eine andere Stadt oder starte einen frischen Scan.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-[#262626] hover:bg-[#333333] text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
              >
                Alle Filter &amp; Städte anzeigen
              </button>
              <button
                onClick={handleTriggerScan}
                disabled={isScanning}
                className="px-4 py-2 bg-[#FF9000] hover:bg-[#FFA31A] text-xs font-bold text-black rounded-lg transition-colors cursor-pointer"
              >
                Quellen neu abchecken
              </button>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredEvents.slice(0, visibleLimit).map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isFavorite={favorites.includes(event.id)}
                    onToggleFavorite={() => handleToggleFavorite(event.id)}
                    onOpenDetails={() => setSelectedEventModal(event)}
                    onExportIcs={() => exportToIcs(event)}
                    isNewlyDiscovered={recentNewEvents.some(ne => ne.id === event.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.slice(0, visibleLimit).map(event => (
                  <EventListItem
                    key={event.id}
                    event={event}
                    isFavorite={favorites.includes(event.id)}
                    onToggleFavorite={() => handleToggleFavorite(event.id)}
                    onOpenDetails={() => setSelectedEventModal(event)}
                    onExportIcs={() => exportToIcs(event)}
                    isNewlyDiscovered={recentNewEvents.some(ne => ne.id === event.id)}
                  />
                ))}
              </div>
            )}

            {filteredEvents.length > visibleLimit && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setVisibleLimit(prev => prev + 120)}
                  className="px-6 py-2.5 bg-[#FF9000] hover:bg-[#FFA31A] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Weitere Konzerte laden ({Math.min(120, filteredEvents.length - visibleLimit)} von {filteredEvents.length - visibleLimit} übrig)
                </button>
                <button
                  onClick={() => setVisibleLimit(filteredEvents.length)}
                  className="px-4 py-2.5 bg-[#1b1b1b] hover:bg-[#262626] border border-[#2e2e2e] text-xs font-semibold text-neutral-200 rounded-lg transition-colors cursor-pointer"
                >
                  Alle {filteredEvents.length} anzeigen
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* 6. Modals */}
      <EventModal
        event={selectedEventModal}
        onClose={() => setSelectedEventModal(null)}
        isFavorite={selectedEventModal ? favorites.includes(selectedEventModal.id) : false}
        onToggleFavorite={() => selectedEventModal && handleToggleFavorite(selectedEventModal.id)}
      />

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        rules={notificationRules}
        onSaveRules={handleSaveNotificationRules}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        recentNewEvents={recentNewEvents}
        onSelectEvent={ev => setSelectedEventModal(ev)}
      />

      <SourcesModal
        isOpen={isSourcesModalOpen}
        onClose={() => {
          setIsSourcesModalOpen(false);
          if (currentView === 'sources') setCurrentView('events');
        }}
        sources={sources}
        onToggleSource={handleToggleSource}
        onAddCustomSource={handleAddCustomSource}
        onTriggerScan={handleTriggerScan}
        isScanning={isScanning}
      />

      <AiScoutModal
        isOpen={isAiScoutModalOpen}
        onClose={() => setIsAiScoutModalOpen(false)}
        selectedCity={selectedCity}
      />

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f] bg-black py-6 text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">
              Konzi<span className="bg-[#FF9000] text-black px-1 py-0.5 rounded-[3px] ml-0.5">Hub</span>
            </span>
            <span>· Punk, Metal, Hardcore Konzert-Scanner</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSourcesModalOpen(true)}
              className="hover:text-[#FF9000] transition-colors cursor-pointer"
            >
              Quellen
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="hover:text-[#FF9000] transition-colors cursor-pointer"
            >
              Benachrichtigungen
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsAiScoutModalOpen(true)}
              className="hover:text-[#FF9000] transition-colors cursor-pointer"
            >
              AI Scout
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
