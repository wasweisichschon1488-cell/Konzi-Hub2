import { ConcertEvent } from '../types/concert';

export interface SearchableBand {
  displayName: string;
  searchQuery: string;
  bandcampUrl: string;
  soundcloudUrl: string;
  youtubeUrl: string;
}

const STOP_WORDS = new Set([
  'konzert',
  'live',
  'gig',
  'soli',
  'solikonzert',
  'soliparty',
  'benefit',
  'tba',
  'more',
  'guests',
  'special guest',
  'special guests',
  'support',
  'supports',
  'aftershow',
  'dj',
  'djs',
  'party',
  'club',
  'doors',
  'einlass',
  'beginn',
  'eintritt',
  'u.a.',
  'u.v.m.',
  'uvm',
  'etc',
  'tickets',
  'berlin',
  'hamburg',
  'münchen',
  'munich',
  'köln',
  'cologne',
  'leipzig',
  'frankfurt',
  'dresden',
  'stuttgart',
  'bremen',
  'hannover',
  'dortmund',
  'essen',
  'nürnberg',
  'bochum',
  'münster',
  'bielefeld',
  'wien',
  'zürich',
]);

function stripEmojis(str: string): string {
  return str
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSingleBand(raw: string, event?: ConcertEvent): SearchableBand | null {
  let cleaned = stripEmojis(raw)
    .replace(/^\d{2}\.\d{2}\.\d{4}:?\s*/i, '')
    .replace(/^(?:konzert|gig|live|solikonzert|band\(s\)):\s*/i, '')
    .replace(/^.*?pres(?:\.|entiert|ents)?:?\s*/i, '')
    .replace(/\s*\|\s*.*$/, '')
    .replace(/\s*@\s*.*$/, '')
    .replace(/\s+Tickets?\s+ab\s+.*$/i, '')
    .replace(/\s+(?:[A-Za-zÄÖÜäöüß-]+)?Band\s+aus\s+.*$/i, '')
    .replace(/\s+(?:feiert|feiern|präsentiert|präsentieren|spielt|spielen)\s+.*$/i, '')
    .replace(/\s*[-–]\s*[^-–]*\b(?:European|EU|World|Deutschland|Germany|Anniversary|Resurrection|Farewell|Club)?\s*Tour(?:\s*\d{4})?.*$/i, '')
    .replace(/\s*\bTour\s*\d{4}\b.*$/i, '')
    .replace(/^[-–•·:,;+/\s]+|[-–•·:,;+/\s]+$/g, '')
    .trim();

  if (!cleaned || cleaned.length < 2) return null;
  const lower = cleaned.toLowerCase();
  if (STOP_WORDS.has(lower)) return null;
  if (event?.city && lower === event.city.toLowerCase()) return null;
  if (event?.venue && lower === event.venue.toLowerCase()) return null;
  if (/^(?:eintritt|einlass|beginn|soli|spende|ab\s+\d)/i.test(cleaned)) return null;

  // Build search-friendly band query without country tags or "(Ex-XYZ)" notes
  const searchQuery = cleaned
    .replace(/\((?:Ex-[^)]+|USA|UK|DE|NL|BE|FR|SE|FI|NO|PL|AT|CH|IT|ES|AU|CA|JP|[A-Z]{2,3})\)/gi, '')
    .replace(/\b(?:Live|Release\s*Show|Record\s*Release|Album\s*Release|30th\s*Anniversary)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!searchQuery || searchQuery.length < 2) return null;

  return {
    displayName: cleaned,
    searchQuery,
    bandcampUrl: `https://bandcamp.com/search?q=${encodeURIComponent(searchQuery)}`,
    soundcloudUrl: `https://soundcloud.com/search?q=${encodeURIComponent(searchQuery)}`,
    youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${searchQuery} band`)}`,
  };
}

/**
 * Extracts clean, individual clickable bands with Bandcamp, SoundCloud & YouTube search URLs
 * from a ConcertEvent (handling noisy RSS/HTML titles cleanly).
 */
export function extractSearchableBands(event: ConcertEvent): SearchableBand[] {
  const candidates: string[] = [];

  // If event.bands was prematurely split inside a promoter prefix (e.g. "Plus1 Punk/HC Shows pres.: ..."),
  // prefer event.title so the full promoter prefix can be stripped cleanly before splitting.
  const hasBrokenPromoterPrefix =
    event.bands &&
    event.bands.length > 1 &&
    /pres(?:\.|entiert|ents)?:?/i.test(event.title) &&
    event.bands.some(b => /pres(?:\.|entiert|ents)?:?/i.test(b));

  const rawSources =
    !hasBrokenPromoterPrefix && event.bands && event.bands.length > 0
      ? event.bands
      : [event.title];

  for (const item of rawSources) {
    if (!item) continue;

    // Normalize common promoter & venue suffixes before splitting
    let prepared = stripEmojis(item)
      .replace(/^.*?pres(?:\.|entiert|ents)?:?\s*/i, '')
      .replace(/\s*\|\s*.*$/, '')
      .replace(/\s+Tickets?\s+ab\s+.*$/i, '')
      .replace(/\s*[-–]\s*[^-–]*\b(?:European|EU|World|Deutschland|Germany|Anniversary|Resurrection|Farewell)?\s*Tour(?:\s*\d{4})?.*$/i, '');

    // Protect "Punk/HC" etc. so "/" doesn't split genre labels
    prepared = prepared
      .replace(/\b(Punk|Hardcore|Crust|Metal|Ska|HC)\/(HC|Punk|Metal|Crust|Oi)\b/gi, '$1-$2')
      .replace(/\s*(?:\bsupports?:\s*|\bspecial\s+guests?:\s*|\bguests?:\s*|\bfeaturing\b|\bfeat\.?\s+|\bft\.?\s+|\bw\/\s*|\bmit\s+|\baftershow:\s*)/gi, ' + ')
      .replace(/\s*(?:\+|&|\s+vs\.?\s+|\s+x\s+|•|·)\s*/gi, ' + ')
      .replace(/\s+[-–]\s+/g, ' + ')
      .replace(/\s*\/\s*/g, ' + ')
      .replace(/,\s+/g, ' + ');

    for (const part of prepared.split(' + ')) {
      const trimmed = part.trim();
      if (trimmed) candidates.push(trimmed);
    }
  }

  // Also check event.description for explicit "Support:" or "Bands:" lines if only 0-1 band found so far
  if (candidates.length <= 1 && event.description) {
    const supportMatch = event.description.match(/(?:support|with|mit|lineup|bands?):\s*([^\n.;]+)/i);
    if (supportMatch && supportMatch[1]) {
      const extraParts = supportMatch[1].split(/\s*(?:\+|,|\/|&|\bund\b)\s*/i);
      for (const p of extraParts) {
        if (p.trim()) candidates.push(p.trim());
      }
    }
  }

  const seen = new Set<string>();
  const result: SearchableBand[] = [];

  for (const cand of candidates) {
    const parsed = cleanSingleBand(cand, event);
    if (!parsed) continue;
    const key = parsed.searchQuery.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(parsed);
  }

  // Fallback: if nothing survived cleaning (e.g. single-word festival or event), use cleaned event.title
  if (result.length === 0 && event.title) {
    const cleanTitle = stripEmojis(event.title);
    const fallback = cleanSingleBand(event.title, event) || {
      displayName: event.title,
      searchQuery: cleanTitle,
      bandcampUrl: `https://bandcamp.com/search?q=${encodeURIComponent(cleanTitle)}`,
      soundcloudUrl: `https://soundcloud.com/search?q=${encodeURIComponent(cleanTitle)}`,
      youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}`,
    };
    result.push(fallback);
  }

  return result;
}
