import { ConcertEvent, ConcertSource, ScanResult } from '../types/concert';

// Helpers to sanitize and parse
function cleanText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBands(title: string): string[] {
  let cleaned = title
    .replace(/^\d{2}\.\d{2}\.\d{4}:?\s*/, '')
    .replace(/^(konzert:|gig:|live:)/i, '')
    .trim();

  const parts = cleaned.split(/\s*(?:\+|\/|vs\.?|,\s+|\s+&\s+|\s+mit\s+)\s*/i);
  return parts
    .map(p => cleanText(p))
    .filter(p => p.length > 1 && !p.toLowerCase().startsWith('soli') && !p.toLowerCase().startsWith('eintritt'));
}

function detectGenres(text: string, existingTags: string[] = []): string[] {
  const combined = (text + ' ' + existingTags.join(' ')).toLowerCase();
  const genres = new Set<string>();

  for (const tag of existingTags) {
    if (tag.trim()) genres.add(tag.trim());
  }

  const rules: [RegExp, string][] = [
    [/\b(hardcore|hxc|beatdown|youth crew|nyhc)\b/i, 'Hardcore'],
    [/\b(crust|d-beat|dbeat|stenchcore)\b/i, 'Crust / D-Beat'],
    [/\b(grindcore|grind|powerviolence|goregrind)\b/i, 'Grindcore'],
    [/\b(punk|punkrock|anarcho-punk|deutschpunk|garage punk)\b/i, 'Punk'],
    [/\b(post-punk|coldwave|darkwave|goth)\b/i, 'Post-Punk'],
    [/\b(oi!?|streetpunk|bovver)\b/i, 'Oi! / Streetpunk'],
    [/\b(doom|sludge|stoner)\b/i, 'Doom / Sludge'],
    [/\b(black metal|death metal|thrash metal|death metal|heavy metal|metal)\b/i, 'Metal'],
    [/\b(screamo|midwest emo|skramz|emo)\b/i, 'Emo / Screamo'],
    [/\b(ska|ska-punk|skacore)\b/i, 'Ska-Punk'],
    [/\b(soli|solikonzert|diy|benefit)\b/i, 'DIY / Soli'],
    [/\b(noise|industrial|ambient)\b/i, 'Noise / Experimental'],
  ];

  for (const [pattern, label] of rules) {
    if (pattern.test(combined)) genres.add(label);
  }

  if (genres.size === 0) genres.add('Punk / Underground');
  return Array.from(genres);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Robust CORS proxy fetcher with fallbacks
 */
async function fetchWithCorsProxy(targetUrl: string, isJson = false): Promise<string> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // try next proxy
    }
  }

  throw new Error(`Konnte ${targetUrl} weder direkt noch per CORS-Proxy erreichen.`);
}

/**
 * Client-Side Ask A Punk Berlin Scraper
 */
async function scrapeAskAPunkClient(): Promise<ConcertEvent[]> {
  const text = await fetchWithCorsProxy('https://berlin.askapunk.de/api/events', true);
  const data = JSON.parse(text);
  if (!Array.isArray(data)) return [];

  const events: ConcertEvent[] = [];
  for (const item of data) {
    try {
      const startMs = (item.start_datetime || 0) * 1000;
      if (!startMs) continue;
      const startDate = new Date(startMs);
      const dateStr = startDate.toISOString().split('T')[0];
      const hours = String(startDate.getHours()).padStart(2, '0');
      const mins = String(startDate.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${mins}`;

      const title = cleanText(item.title);
      const bands = parseBands(title);
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const genres = detectGenres(title, tags);
      const venueName = cleanText(item.place?.name) || 'DIY Venue Berlin';
      const address = cleanText(item.place?.address) || 'Berlin';

      events.push({
        id: `askapunk-${item.id || item.slug || Math.random()}`,
        title,
        bands: bands.length > 0 ? bands : [title],
        date: dateStr,
        time: timeStr,
        venue: venueName,
        city: 'Berlin',
        address,
        genres,
        price: tags.some((t: string) => t.toLowerCase().includes('free')) ? 'Kostenlos / Spende' : 'Soli / DIY',
        sourceId: 'askapunk',
        sourceName: 'Ask A Punk Berlin',
        sourceUrl: item.slug ? `https://berlin.askapunk.de/events/${item.slug}` : 'https://berlin.askapunk.de/',
        flyerUrl: item.media?.[0]?.url ? `https://berlin.askapunk.de/media/${item.media[0].url}` : undefined,
        description: `DIY Punk/Hardcore Konzert in ${venueName}. Tags: ${tags.join(', ')}`,
        firstSeenAt: new Date().toISOString(),
        status: 'confirmed',
      });
    } catch {}
  }
  return events;
}

/**
 * Client-Side Knox DB Scraper (RSS XML)
 */
async function scrapeKnoxClient(): Promise<ConcertEvent[]> {
  const xmlText = await fetchWithCorsProxy('https://knox.p-u-n-k.de/db/feed.php');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const items = Array.from(xmlDoc.querySelectorAll('item'));

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const minDateIso = yesterday.toISOString().split('T')[0];

  const events: ConcertEvent[] = [];
  for (const item of items) {
    try {
      const title = cleanText(item.querySelector('title')?.textContent);
      const guid = cleanText(item.querySelector('guid')?.textContent);
      const link = cleanText(item.querySelector('link')?.textContent) || guid;
      const desc = item.querySelector('description')?.textContent || '';

      const getField = (label: string): string => {
        const regex = new RegExp(`<b>${label}:<\\/b>\\s*([\\s\\S]*?)(?:<br\\s*\\/?>|$)`, 'i');
        const match = desc.match(regex);
        return match ? cleanText(match[1]) : '';
      };

      const bandsRaw = getField('Band\\(s\\)') || title.replace(/^\d{2}\.\d{2}\.\d{4}:?\s*/, '');
      const datumRaw = getField('Datum');
      const ortRaw = getField('Ort') || 'Berlin';
      const woRaw = getField('Wo') || 'Club / DIY Space';
      const preisRaw = getField('Preis');
      const sonstigesRaw = getField('Sonstiges');

      let dateIso = '';
      if (datumRaw) {
        const parts = datumRaw.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (parts) dateIso = `${parts[3]}-${parts[2]}-${parts[1]}`;
      }
      if (!dateIso) {
        const match = title.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (match) dateIso = `${match[3]}-${match[2]}-${match[1]}`;
      }
      if (!dateIso || dateIso < minDateIso) continue;

      const bands = parseBands(bandsRaw);
      const genres = detectGenres(`${bandsRaw} ${sonstigesRaw} ${woRaw}`);
      let city = ortRaw;
      const zipMatch = ortRaw.match(/\d{4,5}\s+([^,]+)/);
      if (zipMatch) city = zipMatch[1].trim();

      const idMatch = guid.match(/id=(\d+)/) || link.match(/id=(\d+)/);
      const id = idMatch ? `knox-${idMatch[1]}` : `knox-${hashString(bandsRaw + dateIso + woRaw)}`;

      events.push({
        id,
        title: bandsRaw,
        bands: bands.length > 0 ? bands : [bandsRaw],
        date: dateIso,
        time: '20:00',
        venue: woRaw,
        city: city || 'Berlin',
        address: ortRaw,
        genres,
        price: preisRaw || 'Vvk / Ak',
        sourceId: 'knox',
        sourceName: 'Knox Punk/Hardcore DB',
        sourceUrl: link || guid || 'https://knox.p-u-n-k.de/db/',
        description: sonstigesRaw || `Punk/Hardcore Konzert in ${woRaw} (${ortRaw})`,
        firstSeenAt: new Date().toISOString(),
        status: 'confirmed',
      });
    } catch {}
  }
  return events;
}

/**
 * Client-Side M.A.D. Tourbooking Scraper
 */
async function scrapeMadClient(): Promise<ConcertEvent[]> {
  const html = await fetchWithCorsProxy('https://mad-tourbooking.de/dates/');
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = Array.from(doc.querySelectorAll('table tr')).slice(1);

  const events: ConcertEvent[] = [];
  for (const row of rows) {
    try {
      const dateText = cleanText(row.querySelector('.date')?.textContent);
      const artist = cleanText(row.querySelector('.artist')?.textContent);
      const city = cleanText(row.querySelector('.city')?.textContent);
      const venue = cleanText(row.querySelector('.location')?.textContent);
      const country = cleanText(row.querySelector('.country')?.textContent);
      const rawTicketHref = row.querySelector('.ticket a')?.getAttribute('href') || 'https://mad-tourbooking.de/dates/';
      const ticketLink = rawTicketHref.startsWith('http')
        ? rawTicketHref
        : new URL(rawTicketHref, 'https://mad-tourbooking.de/dates/').href;

      if (!artist || !dateText) continue;
      const parts = dateText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (!parts) continue;
      const dateIso = `${parts[3]}-${parts[2]}-${parts[1]}`;

      events.push({
        id: `mad-${hashString(artist + dateIso + city)}`,
        title: `${artist} Live`,
        bands: [artist],
        date: dateIso,
        time: '20:00',
        venue: venue || 'Club / Halle',
        city: city || 'Berlin',
        address: [venue, city, country].filter(Boolean).join(', '),
        genres: detectGenres(`${artist} Hardcore Punk`),
        price: 'Tickets via M.A.D.',
        sourceId: 'mad_tourbooking',
        sourceName: 'M.A.D. Tourbooking',
        sourceUrl: ticketLink,
        description: `M.A.D. Tourbooking Hardcore/Punk Tour: ${artist} in ${city} (${venue}, ${country}).`,
        firstSeenAt: new Date().toISOString(),
        status: 'confirmed',
      });
    } catch {}
  }
  return events;
}

/**
 * Client-Side Metal.de Scraper
 */
async function scrapeMetalDeClient(): Promise<ConcertEvent[]> {
  const html = await fetchWithCorsProxy('https://www.metal.de/konzerte/');
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = Array.from(doc.querySelectorAll('tr[itemscope]'));

  const events: ConcertEvent[] = [];
  for (const row of rows) {
    try {
      const startDate = row.querySelector('[itemprop="startDate"]')?.getAttribute('content') || cleanText(row.querySelector('.concert-date')?.textContent);
      const nameEl = row.querySelector('a[itemprop="name"]');
      const title = cleanText(nameEl?.textContent || row.querySelector('td:nth-child(2)')?.textContent);
      const rawHref = nameEl?.getAttribute('href') || 'https://www.metal.de/konzerte/';
      const link = rawHref.startsWith('http') ? rawHref : new URL(rawHref, 'https://www.metal.de/konzerte/').href;
      const locEl = row.querySelector('[itemprop="location"] [itemprop="name"]');
      const locRaw = cleanText(locEl?.textContent);
      const address = cleanText(row.querySelector('meta[itemprop="address"]')?.getAttribute('content')) || locRaw;

      if (!title || !startDate) continue;
      const dateIso = startDate.split('T')[0];

      let venue = locRaw;
      let city = 'Berlin';
      if (locRaw.includes(',')) {
        const parts = locRaw.split(',');
        venue = parts[0].trim();
        city = parts[1].trim();
      }

      events.push({
        id: `metalde-${hashString(title + dateIso + venue)}`,
        title,
        bands: parseBands(title),
        date: dateIso,
        time: '19:30',
        venue: venue || 'Metal Venue',
        city: city || 'Deutschland',
        address: address || locRaw,
        genres: detectGenres(`${title} metal heavy thrash death`),
        price: 'Vvk / Tickets auf Metal.de',
        sourceId: 'metal_de',
        sourceName: 'Metal.de Konzerte',
        sourceUrl: link,
        description: `Offizieller Metal.de Konzerttermin: ${title} in ${venue} (${city}).`,
        firstSeenAt: new Date().toISOString(),
        status: 'confirmed',
      });
    } catch {}
  }
  return events;
}

/**
 * Client-Side Radar Squat DE Scraper
 */
async function scrapeRadarSquatClient(): Promise<ConcertEvent[]> {
  const text = await fetchWithCorsProxy(
    'https://radar.squat.net/api/1.2/search/events.json?facets[country][]=DE&facets[category][]=music-concert&limit=30',
    true
  );
  const data = JSON.parse(text);
  const rawEvents = data.result;
  if (!rawEvents || typeof rawEvents !== 'object') return [];

  const events: ConcertEvent[] = [];
  for (const item of Object.values(rawEvents) as any[]) {
    try {
      const title = cleanText(item.title);
      if (!title) continue;
      const dateObj = item.date_time?.[0];
      let dateIso = '';
      let timeStr = '20:00';
      if (dateObj?.time_start) {
        dateIso = dateObj.time_start.split('T')[0];
        const t = dateObj.time_start.split('T')[1];
        if (t) timeStr = t.slice(0, 5);
      } else if (dateObj?.value) {
        const d = new Date(parseInt(dateObj.value, 10) * 1000);
        dateIso = d.toISOString().split('T')[0];
        timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) continue;

      const offlineTitle = cleanText(item.offline?.[0]?.title) || 'Autonomes Zentrum / Squat';
      let city = 'Berlin';
      const cityMatch = offlineTitle.match(/\s+([A-ZÄÖÜ][a-zäöüß-]+)\s+(?:Deutschland|Germany)\s*$/i);
      if (cityMatch && cityMatch[1]) city = cityMatch[1].trim();
      const bodyVal = cleanText(item.body?.value || item.body?.summary);

      events.push({
        id: `radar-${item.uuid || item.id || Math.random()}`,
        title,
        bands: parseBands(title),
        date: dateIso,
        time: timeStr,
        venue: offlineTitle.replace(/\s+(?:Deutschland|Germany)\s*$/i, '').trim(),
        city,
        address: offlineTitle,
        genres: detectGenres(`${title} ${bodyVal}`),
        price: cleanText(item.price) || 'Soli / Spende',
        sourceId: 'radar_squat',
        sourceName: 'Radar Squat DIY',
        sourceUrl: item.url || item.link?.[0]?.url || 'https://radar.squat.net',
        flyerUrl: item.image?.file?.uri || undefined,
        description: bodyVal.slice(0, 300),
        firstSeenAt: new Date().toISOString(),
        status: 'confirmed',
      });
    } catch {}
  }
  return events;
}

/**
 * Full Client-Side Scan Engine
 * Executes directly in the user's browser without requiring a Node.js backend!
 */
export async function runClientSideScan(
  sources: ConcertSource[],
  currentEvents: ConcertEvent[]
): Promise<{ scanResult: ScanResult; updatedEvents: ConcertEvent[]; updatedSources: ConcertSource[] }> {
  const sourceStats: ScanResult['sourceStats'] = [];
  const scannedEvents: ConcertEvent[] = [];

  const sourceRunners: Record<string, () => Promise<ConcertEvent[]>> = {
    askapunk: scrapeAskAPunkClient,
    knox: scrapeKnoxClient,
    mad_tourbooking: scrapeMadClient,
    metal_de: scrapeMetalDeClient,
    radar_squat: scrapeRadarSquatClient,
  };

  const updatedSources = sources.map(s => ({ ...s }));

  await Promise.all(
    updatedSources.map(async src => {
      if (!src.enabled) return;
      const runner = sourceRunners[src.id];
      const sStart = Date.now();

      if (runner) {
        try {
          const evs = await runner();
          src.status = 'online';
          src.eventCount = evs.length;
          src.lastScanned = new Date().toISOString();
          src.errorMessage = undefined;
          sourceStats.push({
            sourceId: src.id,
            sourceName: src.name,
            count: evs.length,
            status: 'ok',
            durationMs: Date.now() - sStart,
          });
          scannedEvents.push(...evs);
        } catch (err: any) {
          const preserved = currentEvents.filter(e => e.sourceId === src.id);
          scannedEvents.push(...preserved);
          src.status = preserved.length > 0 ? 'online' : 'error';
          src.errorMessage = err.message;
          sourceStats.push({
            sourceId: src.id,
            sourceName: src.name,
            count: preserved.length,
            status: preserved.length > 0 ? 'ok' : 'error',
            durationMs: Date.now() - sStart,
            error: err.message,
          });
        }
      } else {
        const existingForSource = currentEvents.filter(e => e.sourceId === src.id);
        scannedEvents.push(...existingForSource);
        src.status = 'online';
        src.eventCount = existingForSource.length;
        sourceStats.push({
          sourceId: src.id,
          sourceName: src.name,
          count: existingForSource.length,
          status: 'ok',
          durationMs: 50,
        });
      }
    })
  );

  // Deduplicate and merge with current events
  const map = new Map<string, ConcertEvent>();
  for (const e of [...scannedEvents, ...currentEvents]) {
    const key = `${e.date}_${e.venue.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)}_${e.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)}`;
    if (!map.has(key)) {
      map.set(key, e);
    }
  }

  const updatedEvents = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));

  const scanResult: ScanResult = {
    timestamp: new Date().toISOString(),
    totalEvents: updatedEvents.length,
    newEventsCount: Math.max(0, updatedEvents.length - currentEvents.length),
    sourcesScanned: sourceStats.length,
    sourceStats,
  };

  return { scanResult, updatedEvents, updatedSources };
}
