import { NotificationRule } from '../types/concert';

const FAVORITES_KEY = 'konzihub_favorites';
const RULES_KEY = 'konzihub_notification_rules';
const SETTINGS_KEY = 'konzihub_settings';
const LAST_SCAN_SEEN_KEY = 'konzihub_last_seen_timestamp';

// Legacy keys for seamless migration
const LEGACY_FAVORITES_KEY = 'underground_radar_favorites';
const LEGACY_RULES_KEY = 'underground_radar_notification_rules';
const LEGACY_SETTINGS_KEY = 'underground_radar_settings';
const LEGACY_LAST_SCAN_SEEN_KEY = 'underground_radar_last_seen_timestamp';

export interface UserSettings {
  soundEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  autoRefreshMinutes: number; // 0 for off
  cityFilterDefault: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  desktopNotificationsEnabled: false,
  autoRefreshMinutes: 15,
  cityFilterDefault: 'Berlin',
};

const DEFAULT_RULES: NotificationRule[] = [
  {
    id: 'rule-hardcore',
    name: 'Hardcore & Beatdown',
    type: 'genre',
    keyword: 'Hardcore',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-so36',
    name: 'SO36 Konzerte',
    type: 'venue',
    keyword: 'SO36',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-crust',
    name: 'Crust & D-Beat',
    type: 'genre',
    keyword: 'Crust',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];

export function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY) ?? localStorage.getItem(LEGACY_FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(eventId: string): boolean {
  const favs = getFavorites();
  const index = favs.indexOf(eventId);
  let isNowFav = false;
  if (index >= 0) {
    favs.splice(index, 1);
  } else {
    favs.push(eventId);
    isNowFav = true;
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return isNowFav;
}

export function getNotificationRules(): NotificationRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY) ?? localStorage.getItem(LEGACY_RULES_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveNotificationRules(rules: NotificationRule[]) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function getUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) ?? localStorage.getItem(LEGACY_SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getLastSeenTimestamp(): string {
  return (
    localStorage.getItem(LAST_SCAN_SEEN_KEY) ??
    localStorage.getItem(LEGACY_LAST_SCAN_SEEN_KEY) ??
    new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  );
}

export function updateLastSeenTimestamp(ts?: string) {
  localStorage.setItem(LAST_SCAN_SEEN_KEY, ts || new Date().toISOString());
}
