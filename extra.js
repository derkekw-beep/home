// Weitere reine Funktionen (in test/extra.test.js geprüft): Geburtstage mit Alter, Kalender-Export,
// Wochenrückblick, Sicherung.
import { addDays, dayDiff, occursOn, toDate } from './model.js';

// ---- Geburtstage ------------------------------------------------------------------------------
// Jährlicher Termin mit Geburtsjahr: wie alt wird die Person an diesem Tag? (sonst null)
export function ageOn(ev, day) {
  if (ev.rep !== 'y' || !Number.isInteger(ev.birth) || ev.birth < 1900) return null;
  const a = Number(day.slice(0, 4)) - ev.birth;
  return a > 0 && a < 130 ? a : null;
}
export function evTitle(ev, day) {
  const a = ageOn(ev, day);
  return a ? `${ev.title} (wird ${a})` : ev.title;
}
// Mehrtägig: der wievielte Tag ist das? Liefert z. B. „Tag 2 von 5“ oder ''
export function spanText(ev, day) {
  if (!(ev.days > 1) || ev.rep) return '';
  const i = dayDiff(ev.date, day) + 1;
  return i >= 1 && i <= ev.days ? `Tag ${i} von ${ev.days}` : '';
}

// ---- Kalender-Export (iCalendar, für Apple Kalender, Google usw.) -----------------------------
const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const p2 = n => String(n).padStart(2, '0');
const dDate = day => day.replace(/-/g, '');
const dTime = (day, min) => { const d = addDays(day, Math.floor(min / 1440)), m = ((min % 1440) + 1440) % 1440; return `${dDate(d)}T${p2(Math.floor(m / 60))}${p2(m % 60)}00`; };
const RRULE = { d: 'FREQ=DAILY', w: 'FREQ=WEEKLY', w2: 'FREQ=WEEKLY;INTERVAL=2', m: 'FREQ=MONTHLY', y: 'FREQ=YEARLY' };
export function toICS(events, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Home Planer//DE', 'CALSCALE:GREGORIAN'];
  for (const e of events) {
    if (!e.date || e.x) continue;
    out.push('BEGIN:VEVENT', `UID:${e.id}@home-planer`, `DTSTAMP:${stamp}`, `SUMMARY:${esc(`${e.icon ? `${e.icon} ` : ''}${e.title}`)}`);
    if (e.allDay) out.push(`DTSTART;VALUE=DATE:${dDate(e.date)}`, `DTEND;VALUE=DATE:${dDate(addDays(e.date, Math.max(1, e.days || 1)))}`);
    else out.push(`DTSTART:${dTime(e.date, e.start || 0)}`, `DTEND:${dTime(e.date, (e.start || 0) + Math.max(e.dur || 0, 0))}`);
    if (!e.allDay && e.days > 1 && !e.rep) out.push(`RRULE:FREQ=DAILY;COUNT=${Math.min(e.days, 60)}`);       // mehrere Tage, jeden Tag zur selben Zeit
    if (RRULE[e.rep]) out.push(`RRULE:${RRULE[e.rep]}${e.until ? `;UNTIL=${dDate(e.until)}` : ''}`);
    if (e.note) out.push(`DESCRIPTION:${esc(e.note)}`);
    out.push('END:VEVENT');
  }
  out.push('END:VCALENDAR');
  return `${out.join('\r\n')}\r\n`;
}

// ---- Wochenrückblick --------------------------------------------------------------------------
// Was wurde in den letzten 7 Tagen erledigt – und von wem? hist = [[Zeitpunkt, Person], …] bei Wiederkehrendem
export function weekReview(items, nowMs, days = 7) {
  const since = nowMs - days * 86400000;
  const by = { p1: [], p2: [] };
  for (const t of items) {
    if (t.t !== 'todo' || t.x) continue;
    if (t.done && t.doneAt >= since && by[t.doneBy]) by[t.doneBy].push(t.title);
    for (const [at, who] of t.hist || []) if (at >= since && by[who]) by[who].push(t.title);
  }
  const bought = items.filter(i => i.t === 'shop' && !i.x && i.done && i.doneAt >= since).length;
  const events = items.filter(i => i.t === 'event' && !i.x && !i.rep && i.date >= addDays(new Date(nowMs).toISOString().slice(0, 10), -days) && i.date <= new Date(nowMs).toISOString().slice(0, 10)).length;
  return { by, bought, events, total: by.p1.length + by.p2.length };
}

// ---- Sicherung --------------------------------------------------------------------------------
const KEEP = ['event', 'shop', 'todo', 'stock', 'recipe'];
export function toBackup(items, nowMs) {
  return JSON.stringify({ app: 'home-planer', v: 1, at: nowMs, items: items.filter(i => !i.x && KEEP.includes(i.t)) }, null, 1);
}
// Liefert die einspielbaren Einträge einer Sicherung (oder null, wenn die Datei keine ist)
export function fromBackup(text) {
  let d;
  try { d = JSON.parse(text); } catch { return null; }
  if (!d || d.app !== 'home-planer' || !Array.isArray(d.items)) return null;
  return d.items.filter(i => i && typeof i.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(i.id) && KEEP.includes(i.t) && typeof i.title === 'string')
    .map(({ u, m, x, ...rest }) => rest);
}

// ---- Feiertage (bundesweit) und Kalenderwoche -------------------------------------------------
function easter(y) {                      // Ostersonntag (gregorianisch)
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${p2(month)}-${p2(day)}`;
}
const HOL = new Map();
export function holidays(y) {
  if (!HOL.has(y)) {
    const o = easter(y);
    HOL.set(y, new Map([[`${y}-01-01`, 'Neujahr'], [addDays(o, -2), 'Karfreitag'], [o, 'Ostersonntag'], [addDays(o, 1), 'Ostermontag'], [`${y}-05-01`, 'Tag der Arbeit'],
      [addDays(o, 39), 'Christi Himmelfahrt'], [addDays(o, 49), 'Pfingstsonntag'], [addDays(o, 50), 'Pfingstmontag'], [`${y}-10-03`, 'Tag der Deutschen Einheit'],
      [`${y}-12-24`, 'Heiligabend'], [`${y}-12-25`, '1. Weihnachtstag'], [`${y}-12-26`, '2. Weihnachtstag'], [`${y}-12-31`, 'Silvester']]));
  }
  return HOL.get(y);
}
export const holidayOn = day => holidays(Number(day.slice(0, 4))).get(day) || '';
// Heiligabend und Silvester sind keine gesetzlichen Feiertage – sie werden genannt, aber nicht rot markiert
export const isFree = day => { const n = holidayOn(day); return !!n && n !== 'Heiligabend' && n !== 'Silvester'; };
export function isoWeek(day) {
  const d = toDate(day);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));           // Donnerstag dieser Woche
  const first = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round(((d - first) / 86400000 - 3 + ((first.getDay() + 6) % 7)) / 7);
}

// ---- Überschneidungen und freie Zeit ----------------------------------------------------------
const shares = (a, b) => a === 'both' || b === 'both' || !a || !b || a === b;
// Termine mit Uhrzeit am selben Tag, die sich mit dem Entwurf überschneiden und dieselbe Person betreffen
export function conflicts(events, draft) {
  if (draft.allDay) return [];
  const s = draft.start || 0, e = s + Math.max(draft.dur || 0, 1);
  return events.filter(ev => ev.id !== draft.id && !ev.allDay && !ev.x && shares(ev.who, draft.who) && occursOn(ev, draft.date)
    && (ev.start || 0) < e && (ev.start || 0) + Math.max(ev.dur || 0, 1) > s).sort((a, b) => (a.start || 0) - (b.start || 0));
}
// Nächster freier Beginn am selben Tag (Viertelstunden-Raster, 7–22 Uhr): erst nach der gewünschten Zeit, sonst davor
export function freeSlot(events, draft, from = draft.start || 0) {
  const dur = Math.max(draft.dur || 0, 15), lo = 7 * 60, hi = 22 * 60;
  const free = t => t >= lo && t + dur <= hi + 60 && !conflicts(events, { ...draft, start: t, dur }).length;
  for (let t = Math.ceil(from / 15) * 15; t <= hi; t += 15) if (free(t)) return t;
  for (let t = Math.floor(from / 15) * 15; t >= lo; t -= 15) if (free(t)) return t;
  return null;
}

// ---- Suche ------------------------------------------------------------------------------------
// Findet Termine, Aufgaben, Einkäufe, Vorrat und Rezepte. Termine: nächstes Vorkommen zuerst, Vergangenes danach.
export function search(items, query, today, max = 40) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const hit = i => [i.title, i.note, i.items].some(v => String(v || '').toLowerCase().includes(q));
  const out = [];
  for (const i of items) {
    if (i.x || !hit(i)) continue;
    if (i.t === 'event') {
      let day = i.date;
      if (i.rep && day < today) for (let n = 0, d = today; n < 370; n++, d = addDays(d, 1)) if (occursOn(i, d)) { day = d; break; }
      out.push({ it: i, kind: 'event', day, rank: day >= today ? dayDiff(today, day) : 100000 + dayDiff(day, today) });
    } else if (['todo', 'shop', 'stock', 'recipe'].includes(i.t)) out.push({ it: i, kind: i.t, day: i.due || '', rank: (i.done ? 300000 : 200000) + ['todo', 'shop', 'stock', 'recipe'].indexOf(i.t) });
  }
  return out.sort((a, b) => a.rank - b.rank || String(a.it.title).localeCompare(String(b.it.title), 'de')).slice(0, max);
}
