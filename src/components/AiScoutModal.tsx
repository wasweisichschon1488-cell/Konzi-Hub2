import React, { useState } from 'react';
import { Sparkles, Search, Loader2, X, MapPin } from 'lucide-react';

interface AiScoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity?: string;
}

interface ScoutedConcert {
  title: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  genres: string[];
  price: string;
  description: string;
}

export const AiScoutModal: React.FC<AiScoutModalProps> = ({ isOpen, onClose, selectedCity }) => {
  const defaultCityText = selectedCity && selectedCity !== 'all' ? selectedCity : 'Deutschland';
  const [query, setQuery] = useState(`${defaultCityText} DIY Punk & Hardcore Konzerte`);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    scoutedConcerts?: ScoutedConcert[];
    szeneNotes?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScout = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const targetQuery = (customQuery ?? query).trim();
    if (!targetQuery) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: targetQuery }),
      });

      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      if (!isJson) {
        throw new Error('AI Scout benötigt das aktive Node.js-Backend mit Gemini API-Schlüssel.');
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim AI Scouten');
    } finally {
      setLoading(false);
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
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-white uppercase tracking-wide">
                Konzi-Hub AI Underground Scout
              </h3>
              <p className="text-xs text-neutral-400">
                Erkenne Underground-Tipps, Geheimtipps &amp; lokale Szeneninfos
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
          {/* Query Form */}
          <form onSubmit={e => handleScout(e)} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="z. B. Crust & Grindcore in Hamburg oder Leipzig DIY Szene..."
                className="flex-1 text-xs sm:text-sm bg-black border border-[#2e2e2e] rounded-lg px-3.5 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF9000]"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#FF9000] hover:bg-[#FFA31A] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Scouten</span>
              </button>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-neutral-500">Schnellsuche:</span>
              {[
                'Berlin Hardcore Punk',
                'Hamburg Rote Flora & Hafenklang',
                'Leipzig Connewitz DIY Gigs',
                'Köln Sonic Ballroom & Metal',
              ].map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setQuery(prompt);
                    handleScout(undefined, prompt);
                  }}
                  className="px-2 py-0.5 rounded bg-black border border-[#2e2e2e] text-neutral-400 hover:text-[#FF9000] hover:border-[#FF9000]/50 cursor-pointer text-[11px]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </form>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 text-xs text-rose-300 rounded-lg">
              {error}
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4">
              {results.szeneNotes && (
                <div className="p-4 bg-[#FF9000]/10 border border-[#FF9000]/40 rounded-xl text-xs text-neutral-200 leading-relaxed font-sans">
                  <span className="font-bold block mb-1 font-mono uppercase tracking-wider text-[#FF9000]">
                    Szenen-Radar Info:
                  </span>
                  {results.szeneNotes}
                </div>
              )}

              {results.scoutedConcerts && results.scoutedConcerts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                    Gefundene Underground Termine ({results.scoutedConcerts.length})
                  </h4>

                  <div className="space-y-2">
                    {results.scoutedConcerts.map((c, i) => (
                      <div
                        key={i}
                        className="p-3.5 bg-black border border-[#2a2a2a] rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-display font-bold text-base text-white">
                            {c.title}
                          </h5>
                          <span className="text-[11px] font-mono text-[#FF9000] shrink-0">
                            {c.date} · {c.time}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-neutral-400">
                          <span className="flex items-center gap-1 font-medium text-neutral-200">
                            <MapPin className="w-3 h-3 text-[#FF9000]" />
                            <span>{c.venue} ({c.city})</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{c.price}</span>
                        </div>

                        <p className="text-neutral-400 text-[11px] leading-relaxed">
                          {c.description}
                        </p>

                        <div className="text-[10px] text-neutral-500 font-mono">
                          Genres: {c.genres.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
