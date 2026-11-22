import React from 'react';
import { ConcertSource, ScanResult } from '../types/concert';
import { CheckCircle2, AlertTriangle, Loader2, Sparkles, Clock, Globe } from 'lucide-react';

interface ScannerBannerProps {
  sources: ConcertSource[];
  lastScan: ScanResult | null;
  isScanning: boolean;
  totalEvents: number;
  onOpenSourcesModal: () => void;
  onTriggerScan: () => void;
}

export const ScannerBanner: React.FC<ScannerBannerProps> = ({
  sources,
  lastScan,
  isScanning,
  totalEvents,
  onOpenSourcesModal,
}) => {
  const activeSources = sources.filter(s => s.enabled);
  const timeFormatted = lastScan?.timestamp
    ? new Date(lastScan.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : 'Gerade eben';

  return (
    <div className="bg-[#111111] border-y border-[#262626] px-4 sm:px-6 lg:px-8 py-3 my-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left Side: Summary & Status */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF9000] animate-pulse" />
            <span className="font-semibold text-white">
              {totalEvents.toLocaleString('de-DE')} Termine gebündelt
            </span>
          </div>

          <span className="text-neutral-600 hidden sm:inline" aria-hidden="true">·</span>

          <div className="flex items-center gap-1.5 text-neutral-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            <span>Letzter Scan: {timeFormatted}</span>
          </div>

          {lastScan && lastScan.newEventsCount > 0 && (
            <>
              <span className="text-neutral-600 hidden sm:inline" aria-hidden="true">·</span>
              <div className="flex items-center gap-1 text-[#FF9000] font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lastScan.newEventsCount} neue Konzerte entdeckt!</span>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Source Chips & Quick Action */}
        <div className="flex flex-wrap items-center gap-2">
          {activeSources.map(src => {
            const isSrcScanning = isScanning && src.status === 'scanning';
            const isError = src.status === 'error';

            return (
              <div
                key={src.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
                  isError
                    ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                    : isSrcScanning
                    ? 'bg-[#FF9000]/15 border-[#FF9000]/50 text-[#FF9000]'
                    : 'bg-[#1b1b1b] border-[#2e2e2e] text-neutral-300'
                }`}
                title={src.description}
              >
                {isSrcScanning ? (
                  <Loader2 className="w-3 h-3 animate-spin text-[#FF9000]" />
                ) : isError ? (
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-[#FF9000]" />
                )}
                <span className="font-medium">{src.name}</span>
                {src.eventCount !== undefined && src.eventCount > 0 && (
                  <span className="text-[10px] font-mono text-neutral-400">({src.eventCount})</span>
                )}
              </div>
            );
          })}

          <button
            onClick={onOpenSourcesModal}
            className="flex items-center gap-1 text-xs text-neutral-300 hover:text-[#FF9000] px-2.5 py-1 rounded border border-dashed border-[#383838] hover:border-[#FF9000]/60 transition-colors cursor-pointer"
          >
            <Globe className="w-3 h-3" />
            <span>Quellen verwalten</span>
          </button>
        </div>
      </div>
    </div>
  );
};
