import React, { useState, useEffect } from 'react';
import { ConcertEvent } from '../types/concert';
import { exportToIcs, getGoogleCalendarUrl } from '../utils/calendar';
import { safeParseEventDate } from '../utils/cities';
import { extractSearchableBands } from '../utils/bands';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Bookmark,
  ExternalLink,
  Share2,
  Check,
  Disc3,
  AudioLines,
  Play,
  Search,
  Ticket,
  Navigation,
} from 'lucide-react';

interface EventModalProps {
  event: ConcertEvent | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  onClose,
  isFavorite,
  onToggleFavorite,
}) => {
  const [copied, setCopied] = useState(false);
  const [showCustomSearch, setShowCustomSearch] = useState(false);
  const [customBandQuery, setCustomBandQuery] = useState('');

  useEffect(() => {
    setShowCustomSearch(false);
    setCustomBandQuery('');
  }, [event?.id]);

  if (!event) return null;

  const { dateFormatted } = safeParseEventDate(event.date);
  const searchableBands = extractSearchableBands(event);
  const trimmedCustom = customBandQuery.trim();

  const handleCopy = () => {
    const text = `${event.title} @ ${event.venue} (${event.date}, ${event.time}) - ${event.sourceUrl}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${event.venue}, ${event.address}`
  )}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="relative w-full max-w-2xl bg-[#151515] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Flyer banner if available */}
        {event.flyerUrl && (
          <div className="relative h-48 sm:h-64 w-full bg-black overflow-hidden shrink-0">
            <img
              src={event.flyerUrl}
              alt={event.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={e => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-black/40 to-transparent" />
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/80 border border-[#3a3a3a] text-neutral-300 hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Header Info */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mb-2">
              <span className="font-semibold text-[#FF9000] uppercase tracking-wider">
                {event.sourceName}
              </span>
              <span aria-hidden="true">·</span>
              <span>{event.genres.join(' · ')}</span>
            </div>

            <h2 className="font-display font-black text-2xl sm:text-3xl text-white leading-tight">
              {event.title}
            </h2>
          </div>

          {/* Key Facts Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-black rounded-xl border border-[#2a2a2a] text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FF9000] shrink-0" />
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-mono">Datum</span>
                <span className="text-white font-medium">{dateFormatted}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF9000] shrink-0" />
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-mono">Uhrzeit</span>
                <span className="text-white font-medium">{event.time} Uhr</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#FF9000] shrink-0" />
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-mono">Eintritt / Soli</span>
                <span className="text-white font-medium">{event.price}</span>
              </div>
            </div>
          </div>

          {/* Location & Map */}
          <div className="flex items-start justify-between gap-3 p-3.5 bg-black/80 rounded-xl border border-[#2a2a2a] text-xs">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#FF9000] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white text-sm block">{event.venue}</span>
                <span className="text-neutral-400">{event.address}</span>
              </div>
            </div>

            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-white transition-colors shrink-0 font-medium"
            >
              <Navigation className="w-3.5 h-3.5 text-[#FF9000]" />
              <span>Karte / Route</span>
            </a>
          </div>

          {/* Bands Breakdown & Music Discovery Links */}
          {searchableBands.length > 0 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
                    Lineup &amp; Bands anhören ({searchableBands.length})
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Automatische Hörproben-Vorschläge direkt für jede Band:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomSearch(prev => !prev)}
                  className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-[#FF9000] transition-colors cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                  <span>{showCustomSearch ? 'Suche ausblenden' : 'Andere Band suchen'}</span>
                </button>
              </div>

              <div className="space-y-2">
                {searchableBands.map(band => (
                  <div
                    key={band.displayName}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-black border border-[#2a2a2a] hover:border-[#3c3c3c] transition-colors"
                  >
                    <a
                      href={band.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-bold text-white hover:text-[#FF9000] transition-colors group min-w-0"
                      title={`"${band.searchQuery}" direkt auf YouTube suchen`}
                    >
                      <span className="truncate">{band.displayName}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#FF9000] shrink-0 transition-colors" />
                    </a>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <a
                        href={band.bandcampUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#161616] border border-[#2f2f2f] hover:border-[#1DA0C3]/70 hover:bg-[#1DA0C3]/10 text-xs font-semibold text-neutral-200 hover:text-[#4ad0f5] transition-colors"
                        title={`"${band.searchQuery}" auf Bandcamp suchen`}
                      >
                        <Disc3 className="w-3.5 h-3.5 text-[#1DA0C3]" />
                        <span>Bandcamp</span>
                      </a>

                      <a
                        href={band.soundcloudUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#161616] border border-[#2f2f2f] hover:border-[#FF5500]/70 hover:bg-[#FF5500]/10 text-xs font-semibold text-neutral-200 hover:text-[#ff7a33] transition-colors"
                        title={`"${band.searchQuery}" auf SoundCloud suchen`}
                      >
                        <AudioLines className="w-3.5 h-3.5 text-[#FF5500]" />
                        <span>SoundCloud</span>
                      </a>

                      <a
                        href={band.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#161616] border border-[#2f2f2f] hover:border-[#FF9000]/70 hover:bg-[#FF9000]/10 text-xs font-semibold text-neutral-200 hover:text-[#FF9000] transition-colors"
                        title={`"${band.searchQuery}" auf YouTube suchen`}
                      >
                        <Play className="w-3.5 h-3.5 text-[#FF0000] fill-[#FF0000]" />
                        <span>YouTube</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {showCustomSearch && (
                <div className="mt-2.5 p-3 rounded-xl bg-black/90 border border-[#2e2e2e] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={customBandQuery}
                    onChange={e => setCustomBandQuery(e.target.value)}
                    placeholder="Bandnamen aus Beschreibung eingeben..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#151515] border border-[#333] focus:border-[#FF9000] outline-none text-xs text-white placeholder-neutral-500"
                  />
                  {trimmedCustom ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`https://bandcamp.com/search?q=${encodeURIComponent(trimmedCustom)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-[#1b1b1b] border border-[#2f2f2f] hover:border-[#1DA0C3]/70 text-xs font-semibold text-neutral-200 hover:text-[#4ad0f5] transition-colors"
                      >
                        Bandcamp
                      </a>
                      <a
                        href={`https://soundcloud.com/search?q=${encodeURIComponent(trimmedCustom)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-[#1b1b1b] border border-[#2f2f2f] hover:border-[#FF5500]/70 text-xs font-semibold text-neutral-200 hover:text-[#ff7a33] transition-colors"
                      >
                        SoundCloud
                      </a>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${trimmedCustom} band`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-[#FF9000] hover:bg-[#FFA31A] text-xs font-bold text-black transition-colors"
                      >
                        YouTube
                      </a>
                    </div>
                  ) : (
                    <span className="text-[11px] text-neutral-500 px-1">
                      Namen tippen für Links
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Info & Beschreibung
              </h4>
              <p className="text-sm text-neutral-300 leading-relaxed font-sans whitespace-pre-line bg-black/60 p-4 rounded-xl border border-[#262626]">
                {event.description}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Toolbar */}
        <div className="p-4 bg-black border-t border-[#262626] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Favorite button */}
            <button
              onClick={onToggleFavorite}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isFavorite
                  ? 'bg-[#FF9000]/15 border-[#FF9000]/50 text-[#FF9000]'
                  : 'bg-[#1b1b1b] border-[#2e2e2e] text-neutral-200 hover:bg-[#262626]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-[#FF9000]' : ''}`} />
              <span>{isFavorite ? 'Gemerkt' : 'Merken'}</span>
            </button>

            {/* Share / Copy */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#1b1b1b] border border-[#2e2e2e] text-neutral-200 hover:bg-[#262626] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-[#FF9000]" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Kopiert!' : 'Teilen'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Export .ics */}
            <button
              onClick={() => exportToIcs(event)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#1b1b1b] border border-[#2e2e2e] text-neutral-200 hover:bg-[#262626] transition-colors cursor-pointer"
              title="iCal .ics herunterladen"
            >
              <Calendar className="w-4 h-4 text-[#FF9000]" />
              <span>.ICS Kalender</span>
            </button>

            {/* Google Calendar */}
            <a
              href={getGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#1b1b1b] border border-[#2e2e2e] text-neutral-200 hover:bg-[#262626] transition-colors"
            >
              Google Cal
            </a>

            {/* Direct Source Link */}
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#FF9000] hover:bg-[#FFA31A] text-black transition-colors shadow-sm"
            >
              <span>Zur Original-Seite</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
