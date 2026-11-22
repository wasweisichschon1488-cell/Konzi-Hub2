import React, { useState } from 'react';
import { ConcertEvent } from '../types/concert';
import { exportToIcs, getGoogleCalendarUrl } from '../utils/calendar';
import { safeParseEventDate } from '../utils/cities';
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

  if (!event) return null;

  const { dateFormatted } = safeParseEventDate(event.date);

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

          {/* Bands Breakdown & Listen */}
          {event.bands.length > 0 && (
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Lineup / Bands ({event.bands.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {event.bands.map(band => (
                  <a
                    key={band}
                    href={`https://bandcamp.com/search?q=${encodeURIComponent(band)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black border border-[#2a2a2a] hover:border-[#FF9000]/60 text-xs text-neutral-200 hover:text-[#FF9000] transition-colors"
                    title={`"${band}" auf Bandcamp anhören`}
                  >
                    <Disc3 className="w-3.5 h-3.5 text-[#FF9000]" />
                    <span className="font-semibold">{band}</span>
                  </a>
                ))}
              </div>
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
