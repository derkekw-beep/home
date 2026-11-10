// Reine Logik des Planers: Datum, Wiederholungen, Tagesplan, Gruppierung, Paar-Code.
// Kein Zugriff auf Seite oder Speicher – läuft genauso in den Tests unter Node.

export const DAY = 86400000;
export const pad = n => String(n).padStart(2, '0');

// ---- Datum (immer als 'JJJJ-MM-TT', Ortszeit) -------------------------------------------------
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return ymd(d); };
export const dayDiff = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);
export const weekday = s => (toDate(s).getDay() + 6) % 7;            // 0 = Montag
export const mondayOf = s => addDays(s, -weekday(s));
export const weekOf = s => { const mo = mondayOf(s); return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(mo, i)); };
export const daysInMonth = (y, m) => new Date(y, m, 0).getDate();   // m = 1…12
export const addMonths = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(y, m - 1 + n, 1, 12);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(Math.min(d, daysInMonth(t.getFullYear(), t.getMonth() + 1)))}`;
};
// Alle Tage, die ein Monatsblatt zeigt (volle Wochen, Montag zuerst)
export function monthGrid(y, m) {
  const first = `${y}-${pad(m)}-01`;
  const start = mondayOf(first);
  const weeks = Math.ceil((weekday(first) + daysInMonth(y, m)) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
}

export const fmtTime = min => `${pad(Math.floor((((min % 1440) + 1440) % 1440) / 60))}:${pad(((min % 60) + 60) % 60)}`;
export const parseTime = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
export function fmtDur(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} Min.`;
  return m ? `${h} Std. ${m} Min.` : `${h} Std.`;
}

// ---- Termine ----------------------------------------------------------------------------------
// Termin: { t:'event', title, icon, date, allDay, start (Minuten), dur (Minuten), who:'p1'|'p2'|'both',
//           rep:''|'d'|'w'|'w2'|'m'|'y', until:''|Datum, note }
export const REPEATS = [['', 'Nie'], ['d', 'Täglich'], ['w', 'Wöchentlich'], ['w2', 'Alle 2 Wochen'], ['m', 'Monatlich'], ['y', 'Jährlich']];

// Mehrtägige (ganztägige) Termine gelten an jedem ihrer Tage: ev.days = Anzahl Tage
export function occursOn(ev, day) {
  const n = ev.allDay && ev.days > 1 ? Math.min(ev.days, 60) : 1;
  for (let i = 0; i < n; i++) if (startsOn(ev, i ? addDays(day, -i) : day)) return true;
  return false;
}
function startsOn(ev, day) {
  if (day === ev.date) return true;
  if (day < ev.date || !ev.rep) return false;
  if (ev.until && day > ev.until) return false;
  const [y0, m0, d0] = ev.date.split('-').map(Number);
  const [y, m, d] = day.split('-').map(Number);
  const last = daysInMonth(y, m);
  switch (ev.rep) {
    case 'd': return true;
    case 'w': return dayDiff(ev.date, day) % 7 === 0;
    case 'w2': return dayDiff(ev.date, day) % 14 === 0;
    case 'm': return d === Math.min(d0, last);                 // der 31. fällt in kurzen Monaten auf den letzten Tag
    case 'y': return m === m0 && d === Math.min(d0, last);     // 29. Februar -> 28. in Nicht-Schaltjahren
    default: return false;
  }
}

export function eventsOn(events, day) {
  return events.filter(e => occursOn(e, day)).sort((a, b) =>
    (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || (a.start || 0) - (b.start || 0) || String(a.title).localeCompare(String(b.title), 'de'));
}

// Zeitstrahl eines Tages: Termine in Reihenfolge, dazwischen freie Zeit (ab 15 Minuten)
export function dayPlan(timed) {
  const rows = [];
  let end = null;
  for (const ev of timed) {
    const s = ev.start || 0, e = s + Math.max(ev.dur || 0, 0);
    if (end !== null && s - end >= 15) rows.push({ kind: 'gap', from: end, to: s, min: s - end });
    rows.push({ kind: 'ev', ev, start: s, end: e, overlap: end !== null && s < end });
    end = end === null ? e : Math.max(end, e);
  }
  return rows;
}

// Passendes Symbol zum Titel vorschlagen (wie beim Vorbild: tippen, Symbol erscheint)
const ICON_WORDS = [
  ['🦷', '*zahnarzt|zahn'], ['🩺', '*arzt|*ärzt|praxis|impf|untersuch|vorsorge|klinik|krankenhaus|physio|therap'],
  ['🎂', '*geburtstag|geb\\.'], ['💍', '*hochzeit|jahrestag|verlob'], ['❤️', 'date|valentin|zweisam|kuscheln'],
  ['🍽️', 'essen|*restaurant|dinner|brunch|*frühstück|mittag|abendbrot|grillen|kochen|pizza|sushi|döner'],
  ['☕', '*kaffee|café|cafe'], ['🍻', 'bier|kneipe|bar\\b|stammtisch|feiern|*party|geburtstagsfeier'],
  ['🛒', '*einkauf|*supermarkt|markt|rewe|edeka|aldi|lidl|kaufland|dm\\b|drogerie'],
  ['🏋️', 'gym|*fitness|*training|sport|workout|krafttraining'], ['🏃', 'laufen|joggen|lauf\\b'], ['🧘', '*yoga|pilates|meditat'],
  ['⚽', '*fußball|fussball|spiel\\b|turnier'], ['🏊', '*schwimm|baden|therme|sauna'], ['🚴', 'fahrrad|radtour|rad\\b'],
  ['💼', 'arbeit|büro|*meeting|schicht|dienst|*termin chef|kunde|bewerbung|vorstellungsgespräch'],
  ['📚', 'schule|uni\\b|lernen|*prüfung|klausur|vorlesung|kurs|seminar|hausaufgabe'],
  ['💇', '*friseur|*frisör|haare|nägel|nagel|kosmetik|wimpern'], ['🎬', '*kino|film|serie|netflix'],
  ['🎵', '*konzert|*festival|musik|probe|chor'], ['🎭', '*theater|oper|musical|show'], ['🎮', 'zocken|gaming|spielen|spieleabend'],
  ['✈️', '*flug|*urlaub|reise|flughafen|abflug'], ['🚆', 'zug|bahn|ice\\b|bus\\b'], ['🚗', 'auto|*werkstatt|tüv|tanken|fahrt|fahrschule'],
  ['🧹', '*putzen|aufräumen|haushalt|saugen|wischen'], ['🧺', '*wäsche|waschen|bügeln'], ['🗑️', '*müll|tonne|sperrmüll'],
  ['🐶', 'hund|gassi|*tierarzt|katze'], ['👨‍👩‍👧', 'familie|eltern|mama|papa|oma|opa|schwieger'], ['👥', 'treffen|freunde|besuch|verabred'],
  ['📞', 'anruf|telefon|call'], ['💶', 'bank|überweis|miete|rechnung|steuer|versicherung'], ['📦', 'paket|post|abholen|lieferung|umzug'],
  ['🌱', 'garten|pflanzen|gießen|blumen'], ['🛠️', 'handwerker|reparatur|bauen|renovier|streichen'], ['😴', 'schlafen|ausschlafen|pause|ausruhen'],
];
// Wörter gelten am Wortanfang („Radar“ ist kein „Rad“); mit * davor auch mitten im Wort („Hausarzt“)
const ICON_RX = ICON_WORDS.map(([icon, words]) => {
  const all = words.split('|');
  const start = all.filter(w => !w.startsWith('*')), any = all.filter(w => w.startsWith('*')).map(w => w.slice(1));
  return [icon, new RegExp([start.length ? `(^|[^a-zäöüß])(${start.join('|')})` : '', any.join('|')].filter(Boolean).join('|'), 'i')];
});
export const ICONS = ['📌', ...ICON_WORDS.map(w => w[0]), '⭐', '🎁', '🎉', '🏠', '🌙', '☀️'];
export function guessIcon(title) {
  for (const [icon, rx] of ICON_RX) if (rx.test(title || '')) return icon;
  return '📌';
}

// ---- To-dos -----------------------------------------------------------------------------------
// To-do: { t:'todo', title, done, doneAt, who:''|'p1'|'p2'|'both', due:''|Datum, note }
const WD = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export function dueLabel(due, today) {
  const n = dayDiff(today, due);
  if (n < -1) return { text: `seit ${-n} Tagen fällig`, late: true };
  if (n === -1) return { text: 'seit gestern fällig', late: true };
  if (n === 0) return { text: 'Heute', late: false };
  if (n === 1) return { text: 'Morgen', late: false };
  if (n < 7) return { text: WD[weekday(due)], late: false };
  const [y, m, d] = due.split('-').map(Number);
  return { text: `${d}.${m}.${y === Number(today.slice(0, 4)) ? '' : y}`, late: false };
}

// filter: '' = alle, 'p1' / 'p2' = was diese Person betrifft (ihr zugewiesen, beiden oder niemandem)
export function groupTodos(todos, today, filter = '') {
  const mine = t => !filter || !t.who || t.who === 'both' || t.who === filter;
  const open = todos.filter(t => !t.done && mine(t));
  const byDue = (a, b) => a.due.localeCompare(b.due) || (a.c || 0) - (b.c || 0);
  const groups = [
    { key: 'late', title: 'Überfällig', items: open.filter(t => t.due && t.due < today).sort(byDue) },
    { key: 'today', title: 'Heute', items: open.filter(t => t.due === today).sort(byDue) },
    { key: 'soon', title: 'Demnächst', items: open.filter(t => t.due && t.due > today).sort(byDue) },
    { key: 'any', title: 'Ohne Datum', items: open.filter(t => !t.due).sort((a, b) => (b.c || 0) - (a.c || 0)) },
    { key: 'done', title: 'Erledigt', items: todos.filter(t => t.done && mine(t)).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 30) },
  ];
  return groups.filter(g => g.items.length);
}

// ---- Paar-Code --------------------------------------------------------------------------------
// 16 Zeichen aus 32 gut unterscheidbaren (kein I, O, 0, 1) = 80 Bit Zufall
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map(x => ALPHA[x & 31]).join('');
}
// Eingabe aufräumen; liefert den Code oder null
export function normCode(s) {
  const c = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 16 && [...c].every(ch => ALPHA.includes(ch)) ? c : null;
}
export const fmtCode = c => c.replace(/(.{4})(?=.)/g, '$1-');

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
// Aus dem Code: Raum-Nummer (für die Adresse) und Schlüssel (für den Zugriff)
export async function deriveKeys(code) {
  return { spaceId: (await sha(`zweiplan/raum/${code}`)).slice(0, 32), key: await sha(`zweiplan/schluessel/${code}`) };
}

export function uid() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_');
}

// ---- Personen ---------------------------------------------------------------------------------
export const COLORS = ['#e8590c', '#d6336c', '#ae3ec9', '#6741d9', '#3b5bdb', '#1c7ed6', '#0c8599', '#2f9e44', '#74b816', '#f08c00'];
export const other = p => (p === 'p1' ? 'p2' : 'p1');
