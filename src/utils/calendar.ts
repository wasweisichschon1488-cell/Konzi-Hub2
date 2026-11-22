import { ConcertEvent } from '../types/concert';

function parseDateParts(dateStr?: string): [number, number, number] {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return [y, m, d];
    }
  }
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()];
}

/**
 * Generates an .ics file download for a concert event
 */
export function exportToIcs(event: ConcertEvent) {
  const [year, month, day] = parseDateParts(event.date);
  let [hours, minutes] = (event.time || '20:00').split(':').map(Number);
  if (isNaN(hours)) hours = 20;
  if (isNaN(minutes)) minutes = 0;

  // Format to iCal format: YYYYMMDDTHHmmSS
  const pad = (n: number) => String(n).padStart(2, '0');
  const startStr = `${year}${pad(month)}${pad(day)}T${pad(hours)}${pad(minutes)}00`;
  const endHours = (hours + 4) % 24;
  const endStr = `${year}${pad(month)}${pad(day)}T${pad(endHours)}${pad(minutes)}00`;

  const escapeIcs = (str: string) =>
    (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Konzi-Hub//Concert Calendar//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@konzi-hub`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `LOCATION:${escapeIcs(`${event.venue}, ${event.address}`)}`,
    `DESCRIPTION:${escapeIcs(`${event.description}\n\nQuelle: ${event.sourceName}\nLink: ${event.sourceUrl}`)}`,
    `URL:${event.sourceUrl}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${event.date || 'termin'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Returns a web link to add event directly to Google Calendar
 */
export function getGoogleCalendarUrl(event: ConcertEvent): string {
  const [year, month, day] = parseDateParts(event.date);
  let [hours, minutes] = (event.time || '20:00').split(':').map(Number);
  if (isNaN(hours)) hours = 20;
  if (isNaN(minutes)) minutes = 0;

  const pad = (n: number) => String(n).padStart(2, '0');
  const startStr = `${year}${pad(month)}${pad(day)}T${pad(hours)}${pad(minutes)}00Z`;
  const endHours = (hours + 4) % 24;
  const endStr = `${year}${pad(month)}${pad(day)}T${pad(endHours)}${pad(minutes)}00Z`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startStr}/${endStr}`,
    details: `${event.description}\n\nQuelle: ${event.sourceName}\nLink: ${event.sourceUrl}`,
    location: `${event.venue}, ${event.address}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
