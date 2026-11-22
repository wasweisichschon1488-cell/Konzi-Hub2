export interface ConcertEvent {
  id: string;
  title: string;
  bands: string[];
  date: string; // ISO YYYY-MM-DD
  endDate?: string;
  time: string;
  venue: string;
  city: string;
  address: string;
  genres: string[];
  price: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  flyerUrl?: string;
  description: string;
  firstSeenAt: string;
  status: 'confirmed' | 'cancelled' | 'sold_out';
}

export interface ConcertSource {
  id: string;
  name: string;
  url: string;
  description: string;
  focus: string[];
  type: 'rss' | 'api' | 'html' | 'custom' | 'ai';
  enabled: boolean;
  lastScanned?: string;
  eventCount?: number;
  status: 'online' | 'error' | 'scanning';
  errorMessage?: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  type: 'band' | 'venue' | 'genre' | 'city';
  keyword: string;
  enabled: boolean;
  createdAt: string;
  matchCount?: number;
}

export interface ScanResult {
  timestamp: string;
  totalEvents: number;
  newEventsCount: number;
  sourcesScanned: number;
  sourceStats: {
    sourceId: string;
    sourceName: string;
    count: number;
    status: 'ok' | 'error';
    durationMs: number;
    error?: string;
  }[];
}
