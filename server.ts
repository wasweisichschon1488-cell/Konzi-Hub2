import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { ConcertEvent, ConcertSource, ScanResult, NotificationRule } from './src/types/concert';
import {
  scrapeAskAPunk,
  scrapeKnox,
  scrapeStressfaktor,
  scrapeRadarSquat,
  scrapeCustomRss,
  scrapeMetalDe,
  scrapeMadTourbooking,
  scrapeCoreTex,
  scrapeTixForGigs,
  scrapeEventimHardHeavy,
  detectGenres,
  parseBands,
} from './src/server/scrapers';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize Gemini if key is present
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
}

// In-Memory Storage & Cache (pre-seeded with snapshot for zero-latency boot)
let cachedEvents: ConcertEvent[] = [];
const knownEventIds = new Set<string>();
let lastScanResult: ScanResult | null = null;
let isScanning = false;

try {
  const snapPath = path.resolve(import.meta.dirname, 'src/data/initialEvents.json');
  if (fs.existsSync(snapPath)) {
    const initial = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
    if (Array.isArray(initial)) {
      cachedEvents = initial;
      for (const ev of initial) knownEventIds.add(ev.id);
    }
  }
} catch {
  // Ignore snapshot read failure; live scan will populate
}

// Configured Sources
const sources: ConcertSource[] = [
  {
    id: 'askapunk',
    name: 'Ask A Punk Berlin',
    url: 'https://berlin.askapunk.de/',
    description: 'DIY Punk, Crust, Hardcore, Metal & Anarchist Konzerte in Berlin',
    focus: ['Punk', 'Hardcore', 'Metal', 'Crust', 'DIY'],
    type: 'api',
    enabled: true,
    status: 'online',
  },
  {
    id: 'knox',
    name: 'Knox Punk/Hardcore DB',
    url: 'https://knox.p-u-n-k.de/db/',
    description: 'Europas größte Punk-, Hardcore- & Metal-Konzertdatenbank',
    focus: ['Punk', 'Hardcore', 'Oi!', 'Metal', 'D-Beat'],
    type: 'rss',
    enabled: true,
    status: 'online',
  },
  {
    id: 'stressfaktor',
    name: 'Stressfaktor Squat',
    url: 'https://stressfaktor.squat.net/termine',
    description: 'Berliner Terminkalender für linke Subkultur, Politik & Solikonzerte',
    focus: ['Punk', 'Soli', 'Hardcore', 'Subkultur'],
    type: 'html',
    enabled: true,
    status: 'online',
  },
  {
    id: 'radar_squat',
    name: 'Radar Squat DIY',
    url: 'https://radar.squat.net/de/events/country/DE/category/music-concert',
    description: 'Autonome Zentren, Hausprojekte & DIY Live-Konzerte deutschlandweit',
    focus: ['DIY', 'Punk', 'Soliparty', 'Subkultur'],
    type: 'api',
    enabled: true,
    status: 'online',
  },
  {
    id: 'metal_de',
    name: 'Metal.de Konzerte',
    url: 'https://www.metal.de/konzerte/',
    description: 'Deutschlands führendes Metal-Magazin mit aktuellen Tourdaten & Festivalterminen',
    focus: ['Metal', 'Death Metal', 'Black Metal', 'Thrash', 'Doom'],
    type: 'html',
    enabled: true,
    status: 'online',
  },
  {
    id: 'mad_tourbooking',
    name: 'M.A.D. Tourbooking',
    url: 'https://mad-tourbooking.de/dates/',
    description: 'Europas führende Booking-Agentur für Hardcore & Punk (Terror, Madball, Sick of It All, etc.)',
    focus: ['Hardcore', 'Punk', 'Beatdown', 'NYHC', 'Grindcore'],
    type: 'html',
    enabled: true,
    status: 'online',
  },
  {
    id: 'coretex',
    name: 'Core Tex Records',
    url: 'https://coretexrecords.com/Konzerttickets',
    description: 'Legendärer Kreuzberger Hardcore & Punk Plattenladen mit Vorverkaufstickets',
    focus: ['Hardcore', 'Punk', 'Oi!', 'Berlin Live'],
    type: 'html',
    enabled: true,
    status: 'online',
  },
  {
    id: 'tixforgigs',
    name: 'TixForGigs',
    url: 'https://www.tixforgigs.com/',
    description: 'Plattform für Subkultur, Club-Konzerte, Punk, Indie & Metal',
    focus: ['Punk', 'Indie', 'Clubshows', 'Subkultur'],
    type: 'api',
    enabled: true,
    status: 'online',
  },
  {
    id: 'eventim_hard_heavy',
    name: 'Eventim Hard & Heavy',
    url: 'https://www.eventim.de/events/konzerte-1/hard-heavy-2/',
    description: 'Größte Ticketplattform für Metal-, Hardcore- und Rock-Touren in Deutschland',
    focus: ['Metal', 'Hardcore', 'Arenashows', 'Heavy Rock'],
    type: 'api',
    enabled: true,
    status: 'online',
  },
];

// Perform full scan across enabled sources in parallel
async function runFullScan(): Promise<ScanResult> {
  if (isScanning) {
    throw new Error('Ein Scan läuft bereits im Hintergrund.');
  }

  isScanning = true;
  const sourceStats: ScanResult['sourceStats'] = [];
  const scannedEvents: ConcertEvent[] = [];
  let newlyDiscoveredCount = 0;

  const enabledSources = sources.filter(s => s.enabled);

  await Promise.all(
    enabledSources.map(async source => {
      const sourceStart = Date.now();
      source.status = 'scanning';

      try {
        let eventsFromSource: ConcertEvent[] = [];

        if (source.id === 'askapunk') {
          eventsFromSource = await scrapeAskAPunk();
        } else if (source.id === 'knox') {
          eventsFromSource = await scrapeKnox();
        } else if (source.id === 'stressfaktor') {
          eventsFromSource = await scrapeStressfaktor();
        } else if (source.id === 'radar_squat') {
          eventsFromSource = await scrapeRadarSquat();
        } else if (source.id === 'metal_de') {
          eventsFromSource = await scrapeMetalDe();
        } else if (source.id === 'mad_tourbooking') {
          eventsFromSource = await scrapeMadTourbooking();
        } else if (source.id === 'coretex') {
          eventsFromSource = await scrapeCoreTex();
        } else if (source.id === 'tixforgigs') {
          eventsFromSource = await scrapeTixForGigs();
        } else if (source.id === 'eventim_hard_heavy') {
          eventsFromSource = await scrapeEventimHardHeavy();
        } else if (source.type === 'custom' || source.type === 'rss') {
          eventsFromSource = await scrapeCustomRss(source.url, source.name);
        }

        source.status = 'online';
        source.lastScanned = new Date().toISOString();
        source.eventCount = eventsFromSource.length;
        source.errorMessage = undefined;

        sourceStats.push({
          sourceId: source.id,
          sourceName: source.name,
          count: eventsFromSource.length,
          status: 'ok',
          durationMs: Date.now() - sourceStart,
        });

        scannedEvents.push(...eventsFromSource);
      } catch (err: any) {
        // Preserve previously cached events for this source on transient error
        const preserved = cachedEvents.filter(e => e.sourceId === source.id);
        scannedEvents.push(...preserved);

        source.status = preserved.length > 0 ? 'online' : 'error';
        source.errorMessage = err.message || 'Scrape-Fehler';
        sourceStats.push({
          sourceId: source.id,
          sourceName: source.name,
          count: preserved.length,
          status: preserved.length > 0 ? 'ok' : 'error',
          durationMs: Date.now() - sourceStart,
          error: err.message,
        });
      }
    })
  );

  // Keep events from disabled sources out of view while deduplicating enabled sources
  const dedupMap = new Map<string, ConcertEvent>();

  for (const ev of scannedEvents) {
    const normKey = `${ev.date}_${ev.venue.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)}_${ev.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)}`;

    if (!dedupMap.has(normKey)) {
      if (!knownEventIds.has(ev.id)) {
        newlyDiscoveredCount++;
        knownEventIds.add(ev.id);
      }
      dedupMap.set(normKey, ev);
    } else {
      const existing = dedupMap.get(normKey)!;
      for (const g of ev.genres) {
        if (!existing.genres.includes(g)) existing.genres.push(g);
      }
    }
  }

  // Sort chronologically ascending
  cachedEvents = Array.from(dedupMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const scanResult: ScanResult = {
    timestamp: new Date().toISOString(),
    totalEvents: cachedEvents.length,
    newEventsCount: newlyDiscoveredCount,
    sourcesScanned: sourceStats.length,
    sourceStats,
  };

  lastScanResult = scanResult;
  isScanning = false;
  return scanResult;
}

// Automatically trigger initial scan on startup
setTimeout(() => {
  runFullScan()
    .then(res => {
      console.log(`[Konzi-Hub Engine] Initialer Scan beendet: ${res.totalEvents} Konzerte geladen.`);
    })
    .catch(e => {
      console.warn('[Konzi-Hub Engine] Fehler beim Initial-Scan:', e.message);
    });
}, 800);

// API Routes
app.use(express.json());

// 1. Health & Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    isScanning,
    totalEvents: cachedEvents.length,
    lastScan: lastScanResult,
  });
});

// 2. Sources List
app.get('/api/sources', (req, res) => {
  res.json(sources);
});

// 3. Toggle Source
app.patch('/api/sources/:id', (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;
  const src = sources.find(s => s.id === id);
  if (!src) return res.status(404).json({ error: 'Quelle nicht gefunden' });
  if (typeof enabled === 'boolean') {
    src.enabled = enabled;
  }
  res.json(src);
});

// 4. Add Custom Source
app.post('/api/sources/custom', async (req, res) => {
  try {
    const { name, url, focus } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Name und URL sind erforderlich.' });
    }

    const customId = `custom-${Date.now()}`;
    const newSource: ConcertSource = {
      id: customId,
      name,
      url,
      description: 'Benutzerdefinierter Konzertkalender / RSS-Feed',
      focus: Array.isArray(focus) ? focus : ['Punk', 'Hardcore'],
      type: 'custom',
      enabled: true,
      status: 'online',
    };

    sources.push(newSource);

    // Quick test scrape
    try {
      const scraped = await scrapeCustomRss(url, name);
      newSource.eventCount = scraped.length;
      newSource.lastScanned = new Date().toISOString();
      for (const ev of scraped) {
        cachedEvents.push(ev);
        knownEventIds.add(ev.id);
      }
    } catch (e: any) {
      newSource.errorMessage = `Testlauf: ${e.message}`;
    }

    res.json(newSource);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Trigger Scan
app.post('/api/scan', async (req, res) => {
  try {
    const result = await runFullScan();
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Get Events with Filters
app.get('/api/events', (req, res) => {
  let list = [...cachedEvents];
  const { q, venue, genre, city, date, source } = req.query;

  if (typeof q === 'string' && q.trim()) {
    const term = q.toLowerCase().trim();
    list = list.filter(ev =>
      ev.title.toLowerCase().includes(term) ||
      ev.venue.toLowerCase().includes(term) ||
      ev.city.toLowerCase().includes(term) ||
      ev.bands.some(b => b.toLowerCase().includes(term)) ||
      ev.description.toLowerCase().includes(term)
    );
  }

  if (typeof venue === 'string' && venue !== 'all') {
    list = list.filter(ev => ev.venue.toLowerCase().includes(venue.toLowerCase()));
  }

  if (typeof genre === 'string' && genre !== 'all') {
    list = list.filter(ev => ev.genres.some(g => g.toLowerCase().includes(genre.toLowerCase())));
  }

  if (typeof city === 'string' && city !== 'all') {
    list = list.filter(ev => ev.city.toLowerCase().includes(city.toLowerCase()));
  }

  if (typeof source === 'string' && source !== 'all') {
    list = list.filter(ev => ev.sourceId === source);
  }

  if (typeof date === 'string' && date) {
    list = list.filter(ev => ev.date === date);
  }

  res.json({
    total: list.length,
    events: list,
  });
});

// 7. Check Notification Rules against newly discovered events
app.post('/api/notifications/check', (req, res) => {
  const { rules, since } = req.body as { rules: NotificationRule[]; since?: string };
  if (!Array.isArray(rules) || rules.length === 0) {
    return res.json({ matches: [] });
  }

  const enabledRules = rules.filter(r => r.enabled);
  const cutoff = since ? new Date(since).getTime() : 0;

  const matchingEvents: { event: ConcertEvent; matchedRule: NotificationRule }[] = [];

  for (const ev of cachedEvents) {
    // Only check events first seen after cutoff if provided
    if (cutoff > 0 && new Date(ev.firstSeenAt).getTime() < cutoff) continue;

    for (const rule of enabledRules) {
      const kw = rule.keyword.toLowerCase().trim();
      let matched = false;

      if (rule.type === 'band') {
        matched = ev.bands.some(b => b.toLowerCase().includes(kw)) || ev.title.toLowerCase().includes(kw);
      } else if (rule.type === 'venue') {
        matched = ev.venue.toLowerCase().includes(kw);
      } else if (rule.type === 'genre') {
        matched = ev.genres.some(g => g.toLowerCase().includes(kw));
      } else if (rule.type === 'city') {
        matched = ev.city.toLowerCase().includes(kw);
      }

      if (matched) {
        matchingEvents.push({ event: ev, matchedRule: rule });
        break;
      }
    }
  }

  res.json({
    count: matchingEvents.length,
    matches: matchingEvents,
  });
});

// 8. AI Scout (Gemini 2.5 Flash for Underground Gig Discovery)
app.post('/api/gemini/scout', async (req, res) => {
  try {
    if (!aiClient) {
      return res.status(503).json({ error: 'Gemini API-Schlüssel ist nicht konfiguriert.' });
    }

    const { query = 'Punk Hardcore Metal Konzerte' } = req.body;

    const prompt = `Du bist ein Experte für die deutsche Punk-, Hardcore- und Metal-Underground-Szene.
Der Nutzer sucht nach anstehenden Konzertterminen und Gig-Tipps für: "${query}".
Erstelle eine Liste von anstehenden oder typischen Konzerten in relevanten Locations der gewünschten Stadt/Region (z. B. SO36, Köpi, Tommyhaus in Berlin; Rote Flora, Hafenklang, Bambi Galore in Hamburg; Conne Island, Zoro in Leipzig; Sonic Ballroom, Gebäude 9 in Köln; Backstage, Feierwerk in München; Café Glocksee, Béi Chéz Heinz in Hannover).

Antworte ausschließlich im folgenden validen JSON-Format:
{
  "scoutedConcerts": [
    {
      "title": "Bands Name(n)",
      "date": "YYYY-MM-DD",
      "time": "20:00",
      "venue": "Venue Name",
      "city": "Stadt",
      "genres": ["Punk", "Hardcore"],
      "price": "10-15€ Soli",
      "description": "Kurze Beschreibung des Events und Sounds"
    }
  ],
  "szeneNotes": "Kurze Zusammenfassung zur Szene / Location-Tipps"
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware for Full-Stack development
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Konzi-Hub] Läuft auf http://0.0.0.0:${PORT}`);
  });
}

startServer();
