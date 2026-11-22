import React from 'react';
import { Bell, Bookmark, SlidersHorizontal, RefreshCw, Volume2, VolumeX, Sparkles, MapPin } from 'lucide-react';

interface HeaderProps {
  currentView: 'events' | 'favorites' | 'alerts' | 'sources';
  onSelectView: (view: 'events' | 'favorites' | 'alerts' | 'sources') => void;
  onTriggerScan: () => void;
  isScanning: boolean;
  favoritesCount: number;
  newMatchesCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenAiScout: () => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  citiesList: { city: string; count: number }[];
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  onTriggerScan,
  isScanning,
  favoritesCount,
  newMatchesCount,
  soundEnabled,
  onToggleSound,
  onOpenAiScout,
  selectedCity,
  onSelectCity,
  citiesList,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-[#262626]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-6">
        {/* Zone 1: Brand Wordmark (Konzi-Hub iconic style) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectView('events')}
            className="text-left group cursor-pointer focus:outline-none flex items-center"
            aria-label="Konzi-Hub Startseite"
          >
            <span className="font-display font-black text-2xl sm:text-[26px] tracking-tight text-white group-hover:text-neutral-200 transition-colors whitespace-nowrap flex items-center">
              <span>Konzi</span>
              <span className="ml-1 bg-[#FF9000] group-hover:bg-[#FFA31A] text-black px-2 py-0.5 rounded-[5px] font-black tracking-tight leading-none transition-colors">
                Hub
              </span>
            </span>
          </button>

          {/* Compact City Switcher in Top Bar */}
          <div className="hidden sm:flex items-center gap-1 bg-[#1b1b1b] border border-[#2f2f2f] hover:border-[#FF9000]/60 rounded-lg px-2 py-1 transition-colors">
            <MapPin className="w-3.5 h-3.5 text-[#FF9000] shrink-0" />
            <select
              value={selectedCity}
              onChange={e => onSelectCity(e.target.value)}
              aria-label="Stadt wählen"
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1 max-w-[130px]"
            >
              <option value="all" className="bg-[#1b1b1b] text-white">
                Alle Städte
              </option>
              {citiesList.map(c => (
                <option key={c.city} value={c.city} className="bg-[#1b1b1b] text-white">
                  {c.city} ({c.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium">
          <button
            onClick={() => onSelectView('events')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentView === 'events'
                ? 'text-[#FF9000] font-semibold border-b-2 border-[#FF9000]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Konzertkalender
          </button>

          <button
            onClick={() => onSelectView('favorites')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer py-1 ${
              currentView === 'favorites'
                ? 'text-[#FF9000] font-semibold border-b-2 border-[#FF9000]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Merkliste</span>
            {favoritesCount > 0 && (
              <span className="text-xs font-mono bg-[#262626] text-white px-1.5 py-0.5 rounded">
                {favoritesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectView('alerts')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer py-1 ${
              currentView === 'alerts'
                ? 'text-[#FF9000] font-semibold border-b-2 border-[#FF9000]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Such-Alarme</span>
            {newMatchesCount > 0 && (
              <span className="text-xs font-mono bg-[#FF9000] text-black font-bold px-1.5 py-0.5 rounded animate-pulse">
                +{newMatchesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectView('sources')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer py-1 ${
              currentView === 'sources'
                ? 'text-[#FF9000] font-semibold border-b-2 border-[#FF9000]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Quellen</span>
          </button>

          <button
            onClick={onOpenAiScout}
            className="whitespace-nowrap text-xs font-mono text-neutral-400 hover:text-[#FF9000] flex items-center gap-1 cursor-pointer transition-colors"
            title="Szenen-Tipps & AI Gig Scout"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF9000]" />
            <span>AI Scout</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action & Utilities */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 text-neutral-400 hover:text-white hover:bg-[#1b1b1b] rounded-lg transition-colors cursor-pointer"
            title={soundEnabled ? 'Alarm-Sound aktiv' : 'Alarm-Sound stumm'}
            aria-label="Sound umschalten"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#FF9000]" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Primary CTA Button: Scan Now */}
          <button
            onClick={onTriggerScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold tracking-wide uppercase bg-[#FF9000] hover:bg-[#FFA31A] active:scale-95 text-black rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-75 disabled:cursor-wait shadow-sm shadow-[#FF9000]/20 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Checkt Quellen...' : 'Quellen abchecken'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav row */}
      <div className="flex md:hidden items-center justify-around px-2 py-2 border-t border-[#1f1f1f] bg-black text-xs">
        <button
          onClick={() => onSelectView('events')}
          className={`py-1 px-2 rounded cursor-pointer ${currentView === 'events' ? 'text-[#FF9000] font-bold' : 'text-neutral-400'}`}
        >
          Kalender
        </button>
        <button
          onClick={() => onSelectView('favorites')}
          className={`py-1 px-2 rounded flex items-center gap-1 cursor-pointer ${currentView === 'favorites' ? 'text-[#FF9000] font-bold' : 'text-neutral-400'}`}
        >
          Merkliste ({favoritesCount})
        </button>
        <button
          onClick={() => onSelectView('alerts')}
          className={`py-1 px-2 rounded flex items-center gap-1 cursor-pointer ${currentView === 'alerts' ? 'text-[#FF9000] font-bold' : 'text-neutral-400'}`}
        >
          Alarme {newMatchesCount > 0 && `(+${newMatchesCount})`}
        </button>
        <button
          onClick={() => onSelectView('sources')}
          className={`py-1 px-2 rounded cursor-pointer ${currentView === 'sources' ? 'text-[#FF9000] font-bold' : 'text-neutral-400'}`}
        >
          Quellen
        </button>
        <button
          onClick={onOpenAiScout}
          className="py-1 px-2 rounded text-neutral-400 flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-3 h-3 text-[#FF9000]" />
          Scout
        </button>
      </div>
    </header>
  );
};
