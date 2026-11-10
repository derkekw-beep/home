// Die „mitdenkenden“ Teile – alles reine Funktionen (in test/smart.test.js geprüft):
//   - Schnelleingabe: „Zahnarzt morgen 15 Uhr“ -> Titel, Datum, Uhrzeit, Dauer
//   - Einkauf: Menge erkennen, nach Regal sortieren, oft Gekauftes vorschlagen
//   - Heute-Karte: Begrüßung, was als Nächstes kommt, Countdown, freier gemeinsamer Abend
//   - wiederkehrende Aufgaben: nächster Termin
import { addDays, addMonths, weekday, dayDiff, occursOn, eventsOn, fmtDur } from './model.js';

// ---- Schnelleingabe ---------------------------------------------------------------------------
const WDAYS = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
const WSHORT = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'];
const okTime = (h, m) => h >= 0 && h < 24 && m >= 0 && m < 60;

// Liefert { title, date?, start?, dur?, found: [Texte für die Anzeige] }. Nichts erkannt: nur { title }.
export function parseQuick(text, today) {
  let s = ` ${String(text || '').replace(/\s+/g, ' ').trim()} `;
  const out = {};
  const cut = (rx, fn) => {
    const m = rx.exec(s);
    if (!m || fn(m) === false) return false;
    s = `${s.slice(0, m.index)} ${s.slice(m.index + m[0].length)}`;
    return true;
  };
  const num = x => Number(x || 0);

  // Zeitspanne: „15-17 Uhr“, „15:00–16:30“, „von 9 bis 11 Uhr“
  const span = m => {
    const a = num(m[1]) * 60 + num(m[2]), b = num(m[3]) * 60 + num(m[4]);
    if (!okTime(num(m[1]), num(m[2])) || !okTime(num(m[3]), num(m[4])) || a === b) return false;
    out.start = a; out.dur = b > a ? b - a : b + 1440 - a;
  };
  cut(/ (?:von |um |ab )?(\d{1,2}):(\d{2}) ?(?:uhr )?(?:-|–|bis) ?(\d{1,2}):(\d{2})(?: ?uhr)?(?= )/i, span)
    || cut(/ (?:von |um |ab )?(\d{1,2})(?:[.:](\d{2}))? ?(?:uhr )?(?:-|–|bis) ?(\d{1,2})(?:[.:](\d{2}))? ?uhr(?= )/i, span);
  // Uhrzeit: „15:30“, „15 Uhr“, „15.30 Uhr“, „um 9“
  const at = m => { if (!okTime(num(m[1]), num(m[2]))) return false; out.start = num(m[1]) * 60 + num(m[2]); };
  if (out.start === undefined) {
    cut(/ (?:um |ab )?(\d{1,2}):(\d{2})(?: ?uhr)?(?= )/i, at)
      || cut(/ (?:um |ab )?(\d{1,2})(?:\.(\d{2}))? ?uhr(?= )/i, at)
      || cut(/ um (\d{1,2})(?= )/i, at);
  }
  // Dauer: „2h“, „1,5 Std“, „90 Min“
  cut(/ (\d+(?:[.,]\d)?) ?(?:h|std\.?|stunden?)(?= )/i, m => { const v = Math.round(parseFloat(m[1].replace(',', '.')) * 60); if (v < 5 || v > 1440) return false; out.dur = v; })
    || cut(/ (\d{1,3}) ?(?:min\.?|minuten?)(?= )/i, m => { const v = num(m[1]); if (v < 5) return false; out.dur = v; });

  // Wiederholung: „täglich“, „jede Woche“, „alle 2 Wochen“, „monatlich“, „jährlich“ („jeden Freitag“ siehe unten)
  cut(/ (?:jeden tag|täglich)(?= )/i, () => { out.rep = 'd'; }) || cut(/ alle (?:2|zwei) wochen(?= )/i, () => { out.rep = 'w2'; })
    || cut(/ (?:jede woche|wöchentlich)(?= )/i, () => { out.rep = 'w'; }) || cut(/ (?:jeden monat|monatlich)(?= )/i, () => { out.rep = 'm'; })
    || cut(/ (?:jedes jahr|jährlich)(?= )/i, () => { out.rep = 'y'; });

  // Datum: „12.11.“, „12.11.2026“, „am 3.12“
  cut(/ (?:am )?(\d{1,2})\.(\d{1,2})\.?(\d{4}|\d{2})?(?= )/i, m => {
    const d = num(m[1]), mo = num(m[2]);
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return false;
    const ty = Number(today.slice(0, 4));
    let y = m[3] ? (m[3].length === 2 ? 2000 + num(m[3]) : num(m[3])) : ty;
    const mk = yy => `${yy}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!m[3] && mk(y) < today) y++;                          // ohne Jahr: der nächste solche Tag
    out.date = mk(y);
  });
  if (!out.date) {
    cut(/ (heute|morgen|übermorgen)(?: (?:früh|abend|mittag|nachmittag|vormittag))?(?= )/i, m => { out.date = addDays(today, { heute: 0, morgen: 1, übermorgen: 2 }[m[1].toLowerCase()]); })
      || cut(new RegExp(` (?:am |an |diesen )?(jeden )?(nächsten? |kommenden? )?(${WDAYS.join('|')}|(?:${WSHORT.join('|')})\\.)(?= )`, 'i'), m => {
        const w = m[3].toLowerCase(), i = w.endsWith('.') ? WSHORT.indexOf(w.slice(0, -1)) : WDAYS.indexOf(w);
        let n = (i - weekday(today) + 7) % 7;
        if (m[2] && n === 0) n = 7;
        if (m[1] && !out.rep) out.rep = 'w';                     // „jeden Freitag“
        out.date = addDays(today, n);
      });
  }
  const title = s.replace(/\s+/g, ' ').trim().replace(/ (am|um|ab|von|bis|an)$/i, '').replace(/[,;:-]+$/, '').trim();
  out.title = title || String(text || '').trim();
  return out;
}

// Kurztext zu dem, was erkannt wurde (für die Anzeige unter dem Eingabefeld)
export function describeQuick(q, today, fmtDate, fmtTime) {
  const parts = [];
  if (q.date) { const n = dayDiff(today, q.date); parts.push(n === 0 ? 'Heute' : n === 1 ? 'Morgen' : fmtDate(q.date)); }
  if (q.start !== undefined) parts.push(`${fmtTime(q.start)} Uhr`);
  if (q.dur) parts.push(fmtDur(q.dur));
  if (q.rep) parts.push({ d: 'täglich', w: 'jede Woche', w2: 'alle 2 Wochen', m: 'jeden Monat', y: 'jedes Jahr' }[q.rep]);
  return parts.join(' · ');
}

// ---- Einkauf ----------------------------------------------------------------------------------
// „2x Milch“, „3 Bananen“, „500g Hack“ -> Menge und Name getrennt
export function splitQty(title) {
  const m = /^(\d+(?:[.,]\d+)? ?(?:x|×|stk\.?|stück|kg|g|l|ml|pck\.?|packung(?:en)?|dosen?|flaschen?|kisten?|becher|gläser|glas|bund|tüten?)?)\s+(.+)$/i.exec(title.trim());
  return m ? { qty: m[1].replace(/\s+/g, ' '), name: m[2] } : { qty: '', name: title.trim() };
}

export const AISLES = [
  ['obst', '🥦', 'Obst & Gemüse', 'apfel|äpfel|banane|birne|orange|zitrone|limette|traube|beere|erdbeer|himbeer|melone|mango|avocado|kiwi|ananas|pfirsich|kirsch|tomate|gurke|paprika|zwiebel|knoblauch|kartoffel|möhre|karotte|salat|rucola|spinat|brokkoli|blumenkohl|zucchini|aubergine|pilz|champignon|lauch|sellerie|kürbis|ingwer|kräuter|basilikum|petersilie|schnittlauch|obst|gemüse|radieschen|mais|kohl|spargel|bohnen|erbsen'],
  ['back', '🥖', 'Brot & Backwaren', 'brot|brötchen|semmel|toast|baguette|croissant|brezel|kuchen|wrap|tortilla|aufback'],
  ['kuehl', '🧀', 'Kühlregal', 'milch|käse|joghurt|jogurt|butter|margarine|sahne|schmand|quark|ei\\b|eier|frischkäse|mozzarella|feta|parmesan|gouda|skyr|pudding|hefe|tofu|hummus|aufschnitt|creme fraiche|crème'],
  ['fleisch', '🥩', 'Fleisch & Fisch', 'fleisch|hack|hähnchen|hühnchen|pute|schnitzel|steak|wurst|würstchen|salami|schinken|speck|bacon|lachs|fisch|thunfisch|garnelen|gulasch|bratwurst'],
  ['tk', '🧊', 'Tiefkühl', 'tiefkühl|tk\\b|pizza|pommes|eis\\b|fischstäbchen|gefroren'],
  ['vorrat', '🥫', 'Vorrat', 'nudeln|spaghetti|pasta|reis|mehl|zucker|salz|pfeffer|öl|essig|dose|konserve|linsen|kichererbsen|müsli|haferflocken|cornflakes|honig|marmelade|nutella|senf|ketchup|mayo|soße|sauce|brühe|gewürz|backpulver|vanille|kakao|tomatenmark|passata|couscous|nüsse|mandeln|rosinen|pesto'],
  ['suess', '🍫', 'Süßes & Snacks', 'schoko|chips|gummibär|haribo|keks|bonbon|süß|snack|riegel|popcorn|salzstangen|kaugummi|nachtisch'],
  ['trinken', '🥤', 'Getränke', 'wasser|saft|cola|limo|bier|wein|sekt|kaffee|tee\\b|sprudel|schorle|energy|eistee|radler|spezi|fanta|sprite|aperol|gin\\b|kapseln|hafermilch|getränk'],
  ['drogerie', '🧴', 'Drogerie', 'shampoo|duschgel|seife|zahnpasta|zahnbürste|deo|creme|rasier|tampon|binden|watte|taschentücher|kondom|pflaster|sonnencreme|spülung|haarspray|make-up|abschmink|zahnseide|tabletten|ibu|wattepads'],
  ['haushalt', '🧻', 'Haushalt', 'klopapier|toilettenpapier|küchenrolle|spülmittel|waschmittel|weichspüler|müllbeutel|müllsäcke|schwamm|putzmittel|reiniger|alufolie|backpapier|frischhalte|batterie|glühbirne|kerze|spültabs|tabs\\b|servietten|gefrierbeutel|filter'],
  ['tier', '🐾', 'Tier', 'katzenfutter|hundefutter|katzenstreu|leckerli|futter'],
];
const AISLE_RX = AISLES.map(([key, emoji, label, words]) => ({ key, emoji, label, rx: new RegExp(`(${words})`, 'i') }));
// Beim Zuordnen zuerst das Eindeutige („Zahnpasta“ ist keine Pasta, „Apfelsaft“ kein Obst)
const FIRST = ['drogerie', 'haushalt', 'tier', 'trinken', 'suess', 'tk'];
const MATCH_ORDER = [...FIRST.map(k => AISLE_RX.find(a => a.key === k)), ...AISLE_RX.filter(a => !FIRST.includes(a.key))];
const REST = { key: 'rest', emoji: '🛍️', label: 'Sonstiges' };
export function aisleOf(title) {
  const name = splitQty(title).name;
  return MATCH_ORDER.find(a => a.rx.test(name)) || REST;
}
// Offene Einträge nach Regal gruppiert, in Laufrichtung durch den Laden
export const AISLE_LIST = [...AISLES.map(([key, emoji, label]) => ({ key, emoji, label })), { key: 'rest', emoji: '🛍️', label: 'Sonstiges' }];
// custom = eigene Reihenfolge der Regale (so wie man durch den eigenen Laden läuft); nicht Genanntes folgt in der üblichen Reihenfolge
export function groupShop(open, custom = []) {
  const base = [...AISLE_RX, REST];
  const order = [...custom.map(k => base.find(a => a.key === k)).filter(Boolean), ...base.filter(a => !custom.includes(a.key))];
  const map = new Map();
  for (const it of open) { const a = aisleOf(it.title); if (!map.has(a.key)) map.set(a.key, { ...a, items: [] }); map.get(a.key).items.push(it); }
  return order.filter(a => map.has(a.key)).map(a => { const g = map.get(a.key); g.items.sort((x, y) => (x.c || 0) - (y.c || 0)); return { key: g.key, emoji: g.emoji, label: g.label, items: g.items }; });
}
// Vorschläge: was schon öfter gekauft wurde und gerade nicht auf der Liste steht (n = wie oft gekauft)
export function suggestShop(all, typed = '', max = 8) {
  const q = typed.trim().toLowerCase();
  return all.filter(i => i.done && (!q || i.title.toLowerCase().includes(q)) && (q || (i.n || 0) >= 2))
    .sort((a, b) => (b.n || 0) - (a.n || 0) || (b.doneAt || 0) - (a.doneAt || 0)).slice(0, max);
}

// ---- wiederkehrende Aufgaben ------------------------------------------------------------------
export const TODO_REPEATS = [['', 'Einmalig'], ['d', 'Täglich'], ['w', 'Jede Woche'], ['w2', 'Alle 2 Wochen'], ['m', 'Jeden Monat']];
// Nächste Fälligkeit nach dem Abhaken: immer in der Zukunft, im alten Takt
export function nextDue(due, rep, today) {
  let d = due || today;
  const step = x => (rep === 'd' ? addDays(x, 1) : rep === 'w' ? addDays(x, 7) : rep === 'w2' ? addDays(x, 14) : addMonths(x, 1));
  let guard = 0;
  do { d = step(d); } while (d <= today && ++guard < 800);
  return d;
}

// ---- Heute-Karte ------------------------------------------------------------------------------
// Begrüßung nach Tageszeit
export function greeting(hour) {
  return hour < 5 ? 'Gute Nacht' : hour < 11 ? 'Guten Morgen' : hour < 14 ? 'Guten Mittag' : hour < 18 ? 'Guten Tag' : hour < 22 ? 'Guten Abend' : 'Gute Nacht';
}
export const greetIcon = hour => (hour < 5 ? '🌙' : hour < 11 ? '🌅' : hour < 18 ? '☀️' : hour < 22 ? '🌆' : '🌙');
// Der nächste Termin von heute, der noch nicht begonnen hat (oder der gerade läuft)
export function upNext(events, today, nowMin) {
  const timed = eventsOn(events, today).filter(e => !e.allDay);
  const live = timed.find(e => e.start <= nowMin && nowMin < e.start + (e.dur || 0));
  if (live) return { ev: live, live: true, min: live.start + live.dur - nowMin };
  const next = timed.find(e => e.start > nowMin);
  return next ? { ev: next, live: false, min: next.start - nowMin } : null;
}
export function inText(min) {
  if (min < 60) return `in ${min} Min.`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `in ${h} Std. ${m} Min.` : `in ${h} Std.`;
}
// Nächstes Vorkommen eines Termins ab einem Tag (auch bei Wiederholungen); null, wenn keins im nächsten Jahr
export function nextOccurrence(ev, from) {
  if (ev.date >= from) return ev.date;
  if (!ev.rep) return null;
  for (let i = 0, d = from; i < 370; i++, d = addDays(d, 1)) if (occursOn(ev, d)) return d;
  return null;
}
// Countdowns: angepinnte Termine, nach Nähe sortiert
export function countdowns(events, today, max = 3) {
  return events.filter(e => e.pin).map(e => ({ ev: e, date: nextOccurrence(e, today) })).filter(c => c.date)
    .map(c => ({ ...c, days: dayDiff(today, c.date) })).sort((a, b) => a.days - b.days).slice(0, max);
}
export const daysText = n => (n === 0 ? 'heute' : n === 1 ? 'morgen' : `in ${n} Tagen`);
// Der nächste Abend (18–22 Uhr), an dem bei keinem von beiden etwas im Kalender steht
export function freeEvening(events, today, nowMin, span = 10) {
  for (let i = nowMin > 17 * 60 ? 1 : 0; i < span; i++) {
    const d = addDays(today, i);
    const busy = eventsOn(events, d).some(e => !e.allDay && e.start < 22 * 60 && e.start + (e.dur || 0) > 18 * 60);
    if (!busy) return d;
  }
  return null;
}

// ---- Erinnerungen -----------------------------------------------------------------------------
export const REMINDERS = [[-1, 'Nicht erinnern'], [0, 'Zum Beginn'], [10, '10 Min. vorher'], [30, '30 Min. vorher'], [60, '1 Std. vorher'], [120, '2 Std. vorher'], [1440, '1 Tag vorher']];
const remText = (rem, start) => (rem === 0 ? 'Jetzt' : rem >= 1440 ? 'Morgen' : rem >= 60 ? `In ${fmtDur(rem)}` : `In ${rem} Min.`) + ` · ${fmtT(start)} Uhr`;
const fmtT = min => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
// Zeitpunkt (ms) aus Tag + Minuten in Ortszeit des Geräts
const atLocal = (day, min) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d, 0, min, 0, 0).getTime(); };

// Plan aller Mitteilungen der nächsten Tage für beide Personen. Der Dienst verschickt sie zur angegebenen Zeit.
//   - vor jedem Termin mit Uhrzeit (Vorlauf je Termin: ev.rem, sonst 30 Minuten)
//   - morgens ein Tagesüberblick je Person (Uhrzeit: person.sum in Minuten, -1 = aus; sonst 8:00), nur wenn etwas ansteht
export function buildPlan(items, now = new Date(), days = 30, max = 150) {
  const live = items.filter(i => !i.x);
  const events = live.filter(i => i.t === 'event'), todos = live.filter(i => i.t === 'todo' && !i.done && i.due);
  const person = p => live.find(i => i.id === p) || {};
  const nowMs = now.getTime();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const out = [];
  for (let i = 0; i <= days; i++) {
    const day = addDays(today, i);
    const evs = eventsOn(events, day);
    for (const e of evs) {
      if (e.allDay) continue;
      const rem = Number.isInteger(e.rem) ? e.rem : 30;
      if (rem < 0) continue;
      const at = atLocal(day, (e.start || 0) - rem);
      if (at > nowMs) out.push({ at, who: e.who === 'p1' || e.who === 'p2' ? e.who : 'both', title: `${e.icon || '📌'} ${e.title}`, body: remText(rem, e.start || 0), tab: 'cal', tag: `ev-${e.id}` });
    }
    for (const p of ['p1', 'p2']) {
      const sum = Number.isInteger(person(p).sum) ? person(p).sum : 8 * 60;
      if (sum < 0) continue;
      const at = atLocal(day, sum);
      if (at <= nowMs) continue;
      const lines = [
        ...evs.filter(e => e.who === p || e.who === 'both' || !e.who).map(e => `${e.icon || '📌'} ${e.title}${e.allDay ? '' : ` ${fmtT(e.start || 0)}`}`),
        ...todos.filter(t => t.due === day && (!t.who || t.who === 'both' || t.who === p)).map(t => `✅ ${t.title}`),
      ];
      if (lines.length) out.push({ at, who: p, title: '☀️ Dein Tag', body: lines.slice(0, 5).join(' · ') + (lines.length > 5 ? ` · +${lines.length - 5} weitere` : ''), tab: 'cal', tag: `tag-${day}` });
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, max);
}

// ---- Mitdenken ----------------------------------------------------------------------------------
// Einkauf: Was wird nach dem bisherigen Kaufrhythmus wohl bald wieder gebraucht? (buys = letzte Kaufzeitpunkte)
export function buyAgain(all, nowMs, max = 5) {
  const out = [];
  for (const i of all) {
    const b = i.buys || [];
    if (!i.done || i.x || b.length < 3) continue;
    const avg = (b[b.length - 1] - b[0]) / (b.length - 1), since = nowMs - b[b.length - 1];
    if (avg >= 2 * 86400000 && since >= 0.85 * avg && since <= 3 * avg) out.push({ i, r: since / avg });
  }
  return out.sort((a, b) => b.r - a.r).slice(0, max).map(o => o.i);
}
// Steht in den nächsten zehn Tagen ein Geburtstag an, für den noch kein „Geschenk“-To-do offen ist?
export function giftNudge(events, todos, today, hidden = new Set()) {
  let best = null;
  for (const e of events) {
    if (e.x || e.rep !== 'y' || !(e.birth || e.icon === '🎂' || /geburtstag/i.test(e.title || ''))) continue;
    const day = nextOccurrence(e, addDays(today, 1));
    if (!day) continue;
    const days = dayDiff(today, day), key = `${e.id}:${day}`;
    if (days > 10 || hidden.has(key)) continue;
    if (todos.some(t => !t.done && String(t.title || '').toLowerCase().includes(String(e.title).toLowerCase()))) continue;
    if (!best || days < best.days) best = { id: e.id, title: e.title, days, key };
  }
  return best;
}
