import React from 'react';
import { ConcertEvent } from '../types/concert';
import { safeParseEventDate } from '../utils/cities';
import { Calendar, MapPin, Clock, Bookmark, ExternalLink, Sparkles } from 'lucide-react';

interface EventCardProps {
  event: ConcertEvent;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenDetails: () => void;
  onExportIcs: () => void;
  isNewlyDiscovered?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isFavorite,
  onToggleFavorite,
  onOpenDetails,
  onExportIcs,
  isNewlyDiscovered,
}) => {
  const { dayOfWeek, dayNumber, monthName } = safeParseEventDate(event.date);

  return (
    <article className="group relative bg-[#151515] hover:bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#FF9000]/50 rounded-xl overflow-hidden transition-all duration-200 flex flex-col justify-between">
      {/* Top Banner / Flyer Thumbnail if present */}
      {event.flyerUrl && (
        <div className="relative h-36 w-full overflow-hidden bg-black">
          <img
            src={event.flyerUrl}
            alt={event.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85 group-hover:opacity-100"
            onError={e => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-black/40 to-transparent" />
        </div>
      )}

      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Date Stamp + Source Label + Favorite Button */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Authentic Punk Gig Date Stamp */}
          <div className="flex items-center gap-2.5">
            <div className="bg-black border border-[#2e2e2e] group-hover:border-[#FF9000]/60 px-2.5 py-1.5 rounded-lg text-center shrink-0 shadow-sm transition-colors">
              <span className="block text-[10px] font-mono font-bold tracking-wider text-[#FF9000]">
                {dayOfWeek}
              </span>
              <span className="block font-display font-black text-xl leading-none text-white">
                {dayNumber}
              </span>
              <span className="block text-[9px] font-mono uppercase text-neutral-400">
                {monthName}
              </span>
            </div>

            <div>
              {/* Unboxed Metadata: Source & New indicator */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span className="font-medium text-neutral-200">{event.sourceName}</span>
                {isNewlyDiscovered && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#FF9000] font-semibold flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" />
                      <span>Neu</span>
                    </span>
                  </>
                )}
              </div>

              {/* Door Time & Price */}
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span>{event.time}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-neutral-200">{event.price}</span>
              </div>
            </div>
          </div>

          {/* Favorite Toggle */}
          <button
            onClick={e => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isFavorite
                ? 'bg-[#FF9000]/15 border-[#FF9000]/50 text-[#FF9000]'
                : 'bg-black border-[#2e2e2e] text-neutral-500 hover:text-white'
            }`}
            title={isFavorite ? 'Aus Merkliste entfernen' : 'In Merkliste speichern'}
            aria-label="Merken"
          >
            <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-[#FF9000]' : ''}`} />
          </button>
        </div>

        {/* Title / Bands */}
        <h3
          onClick={onOpenDetails}
          className="font-display font-bold text-xl leading-tight text-white group-hover:text-[#FF9000] transition-colors cursor-pointer mb-2 line-clamp-2"
          title={event.title}
        >
          {event.title}
        </h3>

        {/* Venue & Location */}
        <div className="flex items-start gap-1.5 text-xs text-neutral-300 mb-3">
          <MapPin className="w-3.5 h-3.5 text-[#FF9000] shrink-0 mt-0.5" />
          <span className="font-semibold text-neutral-200">{event.venue}</span>
          <span className="text-neutral-400">({event.city})</span>
        </div>

        {/* Description snippet if available */}
        {event.description && (
          <p className="text-xs text-neutral-400 line-clamp-2 mb-4 leading-relaxed font-sans">
            {event.description}
          </p>
        )}

        {/* Unboxed Genre tags footer */}
        <div className="mt-auto pt-3 border-t border-[#262626] flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
            {event.genres.slice(0, 3).map((g, idx) => (
              <React.Fragment key={g}>
                {idx > 0 && <span aria-hidden="true" className="text-neutral-600">/</span>}
                <span className="text-neutral-300">{g}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={e => {
                e.stopPropagation();
                onExportIcs();
              }}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors cursor-pointer"
              title="In Kalender (.ics) exportieren"
              aria-label="Kalenderexport"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenDetails}
              className="p-1.5 text-neutral-400 hover:text-[#FF9000] hover:bg-[#2a2a2a] rounded transition-colors cursor-pointer"
              title="Details anzeigen"
              aria-label="Details"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
