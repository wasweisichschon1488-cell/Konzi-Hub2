import { ConcertEvent } from '../types/concert';

/**
 * Normalizes messy scraped city strings (e.g. "1030 Wien (Austria)", "Berlin Tempelhof", "Hamburg St. Pauli")
 * into clean city names for reliable city switching.
 */
export function normalizeCity(rawCity?: string): string {
  if (!rawCity) return '';
  let city = rawCity
    .replace(/^\s*\d{4,5}[a-zA-Z]?\s+/, '') // Strip leading PLZ like "1030 ", "6525 "
    .replace(/\s*\((?:Austria|Österreich|Holland|Niederlande|Netherlands|CZ|Tschechien|CH|Schweiz|Germany|Deutschland|DE|AT|NL|BE|FR|PL|UK|IT|ES)\)\s*$/i, '')
    .replace(/\s*[-–/]\s*(?:St\.?\s*Pauli|Kreuzberg|Neukölln|Friedrichshain|Tempelhof|Mitte|Wedding|Moabit|Connewitz|Ehrenfeld|Schanze).*$/i, '')
    .trim();

  // Map common Berlin/Hamburg district names attached with space
  if (/^berlin\b/i.test(city) && !/berliner/i.test(city)) return 'Berlin';
  if (/^hamburg\b/i.test(city)) return 'Hamburg';
  if (/^münchen\b/i.test(city) || /^munich$/i.test(city)) return 'München';
  if (/^köln\b/i.test(city) || /^cologne$/i.test(city)) return 'Köln';
  if (/^frankfurt(?:\s+(?:am\s+main|a\.?\s*m\.?|\/\s*main))?$/i.test(city)) return 'Frankfurt';
  if (/^leipzig\b/i.test(city)) return 'Leipzig';
  if (/^dresden\b/i.test(city)) return 'Dresden';
  if (/^stuttgart\b/i.test(city)) return 'Stuttgart';
  if (/^hannover\b/i.test(city)) return 'Hannover';
  if (/^bremen\b/i.test(city)) return 'Bremen';
  if (/^dortmund\b/i.test(city)) return 'Dortmund';
  if (/^nürnberg\b/i.test(city)) return 'Nürnberg';
  if (/^münster\b/i.test(city)) return 'Münster';
  if (/^wien\b/i.test(city) || /^vienna$/i.test(city)) return 'Wien';
  if (/^zürich\b/i.test(city) || /^zurich$/i.test(city)) return 'Zürich';
  if (/^freiburg\b/i.test(city)) return 'Freiburg';
  if (/^kiel\b/i.test(city)) return 'Kiel';
  if (/^prag\b/i.test(city) || /^praha$/i.test(city)) return 'Prag';

  // Strip comma suffixes like "Berlin, Germany"
  if (city.includes(',')) {
    city = city.split(',')[0].trim();
  }

  return city;
}

/**
 * Checks whether an event belongs to the selected city.
 */
export function matchesCity(eventCity: string, eventAddress: string, selectedCity: string): boolean {
  if (!selectedCity || selectedCity === 'all') return true;
  const target = selectedCity.toLowerCase().trim();
  const normEvCity = normalizeCity(eventCity).toLowerCase();
  const rawCity = (eventCity || '').toLowerCase();
  const addr = (eventAddress || '').toLowerCase();

  return normEvCity === target || rawCity.includes(target) || addr.includes(target);
}

/**
 * Extracts all unique normalized cities sorted by concert count descending.
 */
export function extractCitiesList(events: ConcertEvent[]): { city: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const ev of events) {
    const city = normalizeCity(ev.city);
    if (!city || city.toLowerCase() === 'deutschland' || city.toLowerCase() === 'unbekannt') continue;
    counts.set(city, (counts.get(city) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.city.localeCompare(b.city, 'de');
    });
}

/**
 * Formats a Date into local YYYY-MM-DD (avoids UTC midnight day-shift bugs).
 */
export function formatLocalDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Safely parses an event YYYY-MM-DD date string with fallbacks for display.
 */
export function safeParseEventDate(dateStr?: string) {
  const isIso = typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const dateObj = isIso ? new Date(`${dateStr}T12:00:00Z`) : new Date(NaN);
  const isValid = !isNaN(dateObj.getTime());

  if (!isValid) {
    return {
      isValid: false,
      dayOfWeek: 'GIG',
      dayNumber: '--',
      monthName: '---',
      dateDisplay: dateStr || 'TBA',
      dateFormatted: dateStr || 'Datum offen',
    };
  }

  const [, month, day] = dateStr!.split('-');
  return {
    isValid: true,
    dayOfWeek: dateObj.toLocaleDateString('de-DE', { weekday: 'short' }).toUpperCase(),
    dayNumber: day,
    monthName: dateObj.toLocaleDateString('de-DE', { month: 'short' }).toUpperCase(),
    dateDisplay: `${day}.${month}.`,
    dateFormatted: dateObj.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
}
