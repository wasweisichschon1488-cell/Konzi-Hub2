import React, { useState } from 'react';
import { NotificationRule, ConcertEvent } from '../types/concert';
import { playNotificationSound } from '../utils/audio';
import {
  Bell,
  Plus,
  Trash2,
  Volume2,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: NotificationRule[];
  onSaveRules: (rules: NotificationRule[]) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  recentNewEvents: ConcertEvent[];
  onSelectEvent: (ev: ConcertEvent) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  rules,
  onSaveRules,
  soundEnabled,
  onToggleSound,
  recentNewEvents,
  onSelectEvent,
}) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newType, setNewType] = useState<NotificationRule['type']>('band');
  const [newName, setNewName] = useState('');
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const res = await Notification.requestPermission();
      setPermissionState(res);
      if (res === 'granted' && soundEnabled) {
        playNotificationSound();
      }
    } catch {
      // ignore
    }
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    const newRule: NotificationRule = {
      id: `rule-${Date.now()}`,
      name: newName.trim() || `${newType.toUpperCase()}: ${newKeyword.trim()}`,
      type: newType,
      keyword: newKeyword.trim(),
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    onSaveRules([...rules, newRule]);
    setNewKeyword('');
    setNewName('');
  };

  const handleToggleRule = (id: string) => {
    onSaveRules(
      rules.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDeleteRule = (id: string) => {
    onSaveRules(rules.filter(r => r.id !== id));
  };

  const sendTestNotification = () => {
    if (soundEnabled) {
      playNotificationSound();
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Konzi-Hub Alarm', {
        body: 'Test-Benachrichtigung: Neues Punk/Hardcore Konzert im SO36 entdeckt!',
        icon: '/favicon.svg',
      });
    }

    setTestSent(true);
    setTimeout(() => setTestSent(false), 2500);
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
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-white uppercase tracking-wide">
                Konzert-Benachrichtigungen &amp; Watchlist
              </h3>
              <p className="text-xs text-neutral-400">
                Werde sofort alarmiert, sobald deine Lieblingsbands, Venues oder Städte im Scan auftauchen
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. Browser & Sound Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-black rounded-xl border border-[#2a2a2a] text-xs">
            {/* Browser Permission */}
            <div>
              <span className="text-neutral-400 block font-semibold mb-1">
                Desktop-Benachrichtigungen
              </span>
              <div className="flex items-center gap-2">
                {permissionState === 'granted' ? (
                  <span className="flex items-center gap-1 text-[#FF9000] font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Aktiviert</span>
                  </span>
                ) : (
                  <button
                    onClick={requestPermission}
                    className="px-3 py-1 bg-[#FF9000] text-black font-bold rounded hover:bg-[#FFA31A] transition-colors cursor-pointer"
                  >
                    Aktivieren
                  </button>
                )}

                <button
                  onClick={sendTestNotification}
                  className="px-2.5 py-1 bg-[#242424] text-neutral-200 hover:text-white rounded transition-colors cursor-pointer ml-auto"
                >
                  {testSent ? 'Alarm ertönt!' : 'Testen'}
                </button>
              </div>
            </div>

            {/* Sound Synthesizer */}
            <div>
              <span className="text-neutral-400 block font-semibold mb-1">
                Gitarren-Chime Sound
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleSound}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium border transition-colors cursor-pointer ${
                    soundEnabled
                      ? 'bg-[#FF9000]/20 border-[#FF9000]/50 text-[#FF9000]'
                      : 'bg-[#1b1b1b] border-[#2e2e2e] text-neutral-500'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{soundEnabled ? 'Sound An' : 'Stumm'}</span>
                </button>

                <button
                  onClick={() => playNotificationSound()}
                  className="px-2.5 py-1 bg-[#242424] text-neutral-200 hover:text-white rounded transition-colors cursor-pointer"
                >
                  Abspielen
                </button>
              </div>
            </div>
          </div>

          {/* 2. Add New Watchlist Rule */}
          <form onSubmit={handleAddRule} className="p-4 bg-black/80 rounded-xl border border-[#2a2a2a] space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF9000] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Neuen Such-Alarm hinzufügen</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as NotificationRule['type'])}
                className="text-xs bg-[#1b1b1b] border border-[#2e2e2e] rounded px-2.5 py-2 text-white focus:outline-none focus:border-[#FF9000]"
              >
                <option value="band">Band / Künstler</option>
                <option value="venue">Location / Venue</option>
                <option value="genre">Musik-Genre</option>
                <option value="city">Stadt / Bezirk</option>
              </select>

              <input
                type="text"
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                placeholder="z.B. Terror, Hamburg, Crust..."
                className="sm:col-span-2 text-xs bg-[#1b1b1b] border border-[#2e2e2e] rounded px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF9000]"
                required
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Optionale Bezeichnung (z.B. Meine Lieblings-Location)"
                className="text-xs bg-[#1b1b1b] border border-[#2e2e2e] rounded px-3 py-1.5 text-neutral-200 placeholder-neutral-500 w-2/3 focus:outline-none focus:border-[#FF9000]"
              />

              <button
                type="submit"
                className="px-4 py-1.5 bg-[#FF9000] hover:bg-[#FFA31A] text-black font-bold text-xs uppercase tracking-wider rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Alarm speichern</span>
              </button>
            </div>
          </form>

          {/* 3. Existing Rules List */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
              Aktive Alarm-Regeln ({rules.length})
            </h4>

            <div className="space-y-2">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 bg-black border border-[#2a2a2a] rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule.id)}
                      className="accent-[#FF9000] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-white block">{rule.name}</span>
                      <span className="text-[11px] font-mono text-neutral-500">
                        {rule.type.toUpperCase()}: <span className="text-[#FF9000] font-bold">"{rule.keyword}"</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Alarmregel löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Recent Matches */}
          {recentNewEvents.length > 0 && (
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF9000] mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kürzlich entdeckte Treffer ({recentNewEvents.length})</span>
              </h4>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {recentNewEvents.slice(0, 10).map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => {
                      onSelectEvent(ev);
                      onClose();
                    }}
                    className="p-2.5 bg-black hover:bg-[#222222] border border-[#2a2a2a] rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-white">{ev.title}</span>
                      <span className="text-neutral-500 block text-[11px]">
                        {ev.venue} · {ev.date}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#FF9000] shrink-0">Details &rarr;</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
