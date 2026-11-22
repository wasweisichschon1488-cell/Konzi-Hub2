import React from 'react';
import { ConcertEvent } from '../types/concert';
import { safeParseEventDate } from '../utils/cities';
import { MapPin, Bookmark, Calendar, ChevronRight, Sparkles } from 'lucide-react';

interface EventListItemProps {
  event: ConcertEvent;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenDetails: () => void;
  onExportIcs: () => void;
  isNewlyDiscovered?: boolean;
}

export const EventListItem: React.FC<EventListItemProps> = ({
  event,
  isFavorite,
  onToggleFavorite,
  onOpenDetails,
  onExportIcs,
  isNewlyDiscovered,
}) => {
  const { dayOfWeek, dateDisplay } = safeParseEventDate(event.date);

  return (
    <div
      onClick={onOpenDetails}
      className="group bg-[#151515] hover:bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#FF9000]/50 px-4 py-3 rounded-lg transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
    >
      {/* Left: Date + Title + Bands */}
      <div className="flex items-start md:items-center gap-3 min-w-0">
        {/* Date block */}
        <div className="flex flex-col items-center justify-center w-14 shrink-0 bg-black border border-[#2e2e2e] rounded py-1 px-1 text-center font-mono">
          <span className="text-[10px] uppercase font-bold text-[#FF9000] leading-tight">
            {dayOfWeek}
          </span>
          <span className="text-sm font-bold text-white leading-tight">
            {dateDisplay}
          </span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-display font-bold text-base md:text-lg text-white group-hover:text-[#FF9000] transition-colors truncate">
              {event.title}
            </h4>
            {isNewlyDiscovered && (
              <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-mono text-[#FF9000] bg-[#FF9000]/15 border border-[#FF9000]/40 px-1 rounded">
                <Sparkles className="w-2.5 h-2.5" />
                Neu
              </span>
            )}
          </div>

          {/* Unboxed Metadata */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-400 mt-0.5">
            <span className="flex items-center gap-1 font-medium text-neutral-200">
              <MapPin className="w-3 h-3 text-[#FF9000]" />
              <span>{event.venue}</span>
            </span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>{event.city}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="font-mono text-neutral-400">{event.time}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-neutral-200">{event.price}</span>
          </div>
        </div>
      </div>

      {/* Right: Genres + Source + Action buttons */}
      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#262626]">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500 font-mono hidden lg:inline">
            {event.sourceName}
          </span>
          <span className="text-neutral-400 hidden sm:inline">
            {event.genres.slice(0, 2).join(' / ')}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={e => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isFavorite
                ? 'text-[#FF9000] hover:text-[#FFA31A]'
                : 'text-neutral-500 hover:text-white'
            }`}
            title="Merken"
          >
            <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-[#FF9000]' : ''}`} />
          </button>

          <button
            onClick={e => {
              e.stopPropagation();
              onExportIcs();
            }}
            className="p-1.5 text-neutral-500 hover:text-white rounded transition-colors cursor-pointer"
            title="In Kalender (.ics)"
          >
            <Calendar className="w-4 h-4" />
          </button>

          <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-[#FF9000] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  );
};
