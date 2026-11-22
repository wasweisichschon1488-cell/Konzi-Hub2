import React, { useState } from 'react';
import { ConcertSource } from '../types/concert';
import { Globe, Plus, CheckCircle2, AlertTriangle, ExternalLink, Loader2, X, RefreshCw } from 'lucide-react';

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: ConcertSource[];
  onToggleSource: (id: string, enabled: boolean) => void;
  onAddCustomSource: (name: string, url: string, focus: string[]) => Promise<void>;
  onTriggerScan: () => void;
  isScanning: boolean;
}

export const SourcesModal: React.FC<SourcesModalProps> = ({
  isOpen,
  onClose,
  sources,
  onToggleSource,
  onAddCustomSource,
  onTriggerScan,
  isScanning,
}) => {
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customFocus, setCustomFocus] = useState('Punk, Hardcore');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const focusArray = customFocus.split(',').map(s => s.trim()).filter(Boolean);
      await onAddCustomSource(customName.trim(), customUrl.trim(), focusArray);
      setCustomName('');
      setCustomUrl('');
      setFeedback('Quelle erfolgreich hinzugefügt und getestet!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(`Fehler beim Hinzufügen: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="relative w-full max-w-2xl bg-[#151515] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#262626] flex items-center justify-between bg-black">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#FF9000]/15 border border-[#FF9000]/40 text-[#FF9000]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-white uppercase tracking-wide">
                Konzertkalender &amp; Quellen
              </h3>
              <p className="text-xs text-neutral-400">
                Verwalte die gescannten DIY-Kalender oder füge eigene RSS-Feeds hinzu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#242424] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Active Sources List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                Integrierte Quellen ({sources.length})
              </h4>
              <button
                onClick={onTriggerScan}
                disabled={isScanning}
                className="flex items-center gap-1.5 text-xs text-[#FF9000] hover:text-[#FFA31A] cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>Jetzt alle abchecken</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {sources.map(src => {
                const isOnline = src.status === 'online';
                const isError = src.status === 'error';

                return (
                  <div
                    key={src.id}
                    className="p-3.5 bg-black border border-[#2a2a2a] rounded-xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={src.enabled}
                        onChange={e => onToggleSource(src.id, e.target.checked)}
                        className="mt-1 accent-[#FF9000] w-4 h-4 cursor-pointer"
                        id={`src-check-${src.id}`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={`src-check-${src.id}`}
                            className="font-bold text-white text-sm cursor-pointer hover:text-[#FF9000] transition-colors"
                          >
                            {src.name}
                          </label>
                          {isOnline ? (
                            <span className="flex items-center gap-1 text-[11px] text-[#FF9000] font-mono">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Online {src.eventCount ? `(${src.eventCount})` : ''}</span>
                            </span>
                          ) : isError ? (
                            <span className="flex items-center gap-1 text-[11px] text-rose-400 font-mono">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Fehler</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-[#FF9000] font-mono">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Scannt...</span>
                            </span>
                          )}
                        </div>

                        <p className="text-neutral-400 mt-0.5 leading-relaxed">
                          {src.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-neutral-500 font-mono">
                          <span>Focus: {src.focus.join(', ')}</span>
                          <span aria-hidden="true">·</span>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FF9000] hover:underline flex items-center gap-0.5"
                          >
                            <span>Webseite öffnen</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom Source / RSS Form */}
          <form onSubmit={handleAdd} className="p-4 bg-black/80 rounded-xl border border-[#2a2a2a] space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF9000] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Eigene Quelle / RSS-Feed hinzufügen</span>
            </h4>

            <p className="text-xs text-neutral-400">
              Füge einen beliebigen Konzertkalender oder RSS-Feed hinzu (z. B. lokaler Infoladen, Blog, Zine oder Club-RSS).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Name der Quelle (z. B. Supamolly RSS)"
                className="text-xs bg-[#1b1b1b] border border-[#2e2e2e] rounded px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF9000]"
                required
              />

              <input
                type="text"
                value={customFocus}
                onChange={e => setCustomFocus(e.target.value)}
                placeholder="Genres (z. B. Punk, Hardcore, Crust)"
                className="text-xs bg-[#1b1b1b] border border-[#2e2e2e] rounded px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF9000]"
              />
            </div>

            <input
              type="url"
              value={customUrl}
              onChange={e => setCustomUrl(e.target.value)}
              placeholder="https://deine-seite.de/termine oder .../feed"
              className="w-full text-xs bg-[#1b1b1b] border border-[#2e2e2e] rounded px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF9000]"
              required
            />

            {feedback && (
              <p className={`text-xs ${feedback.includes('Fehler') ? 'text-rose-400' : 'text-[#FF9000]'}`}>
                {feedback}
              </p>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#FF9000] hover:bg-[#FFA31A] text-black font-bold text-xs uppercase tracking-wider rounded transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Prüfe URL...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quelle hinzufügen</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
