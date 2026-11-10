// Oberfläche des Planers: Kalender (Zeitstrahl + Monat), Einkaufsliste, To-dos, Einstellungen, Einrichtung.
import * as M from './model.js';
import * as S from './smart.js';
import { createStore } from './store.js';
import { API, LOCAL } from './config.js';
import * as Push from './push.js';

const store = createStore({ storage: localStorage, fetchFn: (u, i) => fetch(u, i), api: API });
const root = document.getElementById('app');
const ui = { tab: 'cal', day: M.ymd(new Date()), month: false, filter: '', follow: true };
{ const t = new URLSearchParams(location.search).get('tab'); if (['cal', 'shop', 'todo'].includes(t)) ui.tab = t; }

// ---- Aussehen (je Gerät): Hell/Dunkel und Farbthema --------------------------------------------
const LOOKS = [['indigo', 'Indigo', '#5046e5'], ['rose', 'Rosé', '#e64980'], ['wald', 'Wald', '#2b8a3e'], ['ozean', 'Ozean', '#1c7ed6'], ['sonne', 'Sonne', '#e8590c'], ['mokka', 'Mokka', '#8a5a3c'], ['nacht', 'Tinte', '#343a52']];
const prefs = { theme: 'auto', look: 'indigo' };
try { Object.assign(prefs, JSON.parse(localStorage.getItem('zweiplan-prefs') || '{}')); } catch { /* Standard */ }
function applyPrefs(saveIt) {
  const el = document.documentElement;
  if (prefs.theme === 'auto') delete el.dataset.theme; else el.dataset.theme = prefs.theme;
  el.dataset.look = LOOKS.some(l => l[0] === prefs.look) ? prefs.look : 'indigo';
  const bg = getComputedStyle(el).getPropertyValue('--bg-flat').trim();     // Farbe der Statusleiste mitziehen
  if (bg) for (const m of document.querySelectorAll('meta[name=theme-color]')) { m.removeAttribute('media'); m.content = bg; }
  if (saveIt) try { localStorage.setItem('zweiplan-prefs', JSON.stringify(prefs)); } catch { /* egal */ }
}
applyPrefs(false);
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyPrefs(false));

// ---- Zoom-Sperre: die App verhält sich wie eine App, nicht wie eine Webseite (immer an) ---------
// iOS beachtet „user-scalable=no“ allein nicht: Zwei-Finger-Zoom und Doppeltipp-Zoom hier abfangen.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());
{ let last = 0; document.addEventListener('touchend', e => { const now = Date.now(); if (now - last < 320 && !e.target.closest('input, textarea, select')) e.preventDefault(); last = now; }, { passive: false }); }

// ---- kleine Helfer ----------------------------------------------------------------------------
const $ = (sel, el = document) => el.querySelector(sel);
const today = () => M.ymd(new Date());
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const fmtDay = (s, opts) => M.toDate(s).toLocaleDateString('de-DE', opts);

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k in el && !k.includes('-')) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat(Infinity).filter(k => k != null && k !== false));
  return el;
}

const ICON = {
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  cart: '<path d="M3 4h2.2l2.3 11h10.4l2-8H6.3"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  todo: '<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.6 2.6 4.9-5.4"/>',
  more: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  down: '<path d="M6 9.5l6 6 6-6"/>',
  left: '<path d="M14.5 6l-6 6 6 6"/>',
  right: '<path d="M9.5 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  repeat: '<path d="M4 11V9a3 3 0 013-3h11l-2.5-2.5M20 13v2a3 3 0 01-3 3H6l2.5 2.5"/>',
};
function icon(name, cls = '') {
  const s = h('span', { class: `ic ${cls}`, 'aria-hidden': 'true' });
  s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;
  return s;
}

// Bewegung: eine Klasse kurz setzen, damit die zugehörige CSS-Animation (neu) abläuft
function play(el, cls) {
  if (!el) return;
  el.classList.remove('in-up', 'in-left', 'in-right', 'in-pop');
  void el.offsetWidth;
  el.classList.add(cls);
}
// Welche Zeilen gab es beim letzten Zeichnen schon? Neue (und gerade abgehakte) gleiten herein.
const known = { set: new Set(), next: new Set(), ready: false };
const knownDone = () => { known.set = known.next; known.next = new Set(); known.ready = true; };

let toastTimer;
function toast(text) {
  let t = $('#toast');
  if (!t) document.body.append(t = h('div', { id: 'toast', role: 'status' }));
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

// Wischen nach links/rechts (ohne das senkrechte Scrollen zu stören)
function swipe(el, onLeft, onRight) {
  let x0 = null, y0 = 0;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > 2 * Math.abs(dy)) (dx < 0 ? onLeft : onRight)();
  }, { passive: true });
}

// Knopf, der erst beim zweiten Tippen auslöst („Löschen“ -> „Wirklich löschen?“)
function confirmBtn(label, sure, fn, cls = 'btn danger') {
  let armed = false, timer;
  const b = h('button', { type: 'button', class: cls, onclick: () => {
    if (armed) return fn();
    armed = true; b.textContent = sure; b.classList.add('armed');
    timer = setTimeout(() => { armed = false; b.textContent = label; b.classList.remove('armed'); }, 3500);
  } }, label);
  b.reset = () => clearTimeout(timer);
  return b;
}

// Auswahl aus wenigen Möglichkeiten: [[Wert, Beschriftung, Stil?], …]
function seg(options, value, onChange, cls = 'seg') {
  const el = h('div', { class: cls, role: 'group' });
  const draw = () => el.replaceChildren(...options.map(([v, label, style]) =>
    h('button', { type: 'button', class: v === value ? 'on' : '', style, 'aria-pressed': String(v === value), onclick: () => { value = v; draw(); onChange(v); } }, label)));
  draw();
  el.set = v => { value = v; draw(); };
  return el;
}
const field = (label, ...control) => h('div', { class: 'field' }, h('div', { class: 'field-label' }, label), ...control);

// ---- Personen ---------------------------------------------------------------------------------
function person(p) {
  const it = store.get(p);
  return { id: p, name: (it && it.name) || (p === store.me ? 'Ich' : 'Partner'), color: (it && it.color) || (p === 'p1' ? M.COLORS[0] : M.COLORS[4]), named: !!(it && it.name) };
}
const whoName = who => (who === 'both' ? 'Zusammen' : who ? person(who).name : '');
const whoVars = who => `--c1:${person(who === 'p2' ? 'p2' : 'p1').color};--c2:${person(who === 'p1' ? 'p1' : 'p2').color}`;
const whoOptions = (both = 'Zusammen') => [[store.me, person(store.me).name], [M.other(store.me), person(M.other(store.me)).name], ['both', both]]
  .map(([v, l]) => [v, [h('i', { class: 'dot', style: whoVars(v) }), l]]);
const whoTag = who => (who ? h('span', { class: 'who', style: whoVars(who) }, h('i', { class: 'dot' }), whoName(who)) : null);

// ---- Fenster von unten (Bearbeiten, Einstellungen) --------------------------------------------
let sheet = null;
function openSheet(title, ...content) {
  closeSheet(true);
  const wrap = h('div', { class: 'sheet-wrap', onclick: e => { if (e.target === wrap) closeSheet(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'sheet-head' }, h('h2', {}, title), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Schließen', onclick: () => closeSheet() }, icon('x'))),
      h('div', { class: 'sheet-body' }, content)));
  document.body.append(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  sheet = wrap;
  return wrap;
}
function closeSheet(now = false) {
  if (!sheet) return;
  const w = sheet;
  sheet = null;
  w.classList.remove('open');
  if (now) w.remove(); else setTimeout(() => w.remove(), 240);
}

// ---- Rahmen: Kopf, Ansicht, Reiter ------------------------------------------------------------
const TABS = [{ id: 'cal', label: 'Kalender', icon: 'cal' }, { id: 'shop', label: 'Einkauf', icon: 'cart' }, { id: 'todo', label: 'To-dos', icon: 'todo' }];
const views = {};

function buildShell() {
  root.replaceChildren(
    h('header', { class: 'top' },
      h('div', { class: 'top-left', id: 'topLeft' }),
      h('div', { class: 'top-right' },
        h('button', { class: 'pill', id: 'btnToday', type: 'button', onclick: () => goDay(today(), true) }, 'Heute'),
        h('button', { class: 'sync', id: 'syncBadge', type: 'button', onclick: openSettings }),
        h('button', { class: 'icon-btn', id: 'btnSettings', type: 'button', 'aria-label': 'Einstellungen', onclick: openSettings }, icon('more')))),
    h('main', { id: 'view' }),
    h('button', { class: 'fab', id: 'fab', type: 'button', 'aria-label': 'Neuer Termin', onclick: () => openEvent() }, icon('plus')),
    h('nav', { class: 'tabs' }, TABS.map(t =>
      h('button', { class: 'tab', type: 'button', 'data-tab': t.id, onclick: () => setTab(t.id) }, icon(t.icon), h('span', {}, t.label), h('i', { class: 'badge' })))));
}

function setTab(id) {
  ui.tab = id;
  const v = $('#view');
  v.replaceChildren();
  v.className = `view-${id}`;
  views[id].mount(v);
  v.scrollTop = 0;
  known.ready = false;
  update();
  play(v, 'in-up');
}

function update() {
  if (!$('#view')) return;
  const t = today();
  for (const b of document.querySelectorAll('.tab')) b.classList.toggle('on', b.dataset.tab === ui.tab);
  const openShop = store.all('shop').filter(i => !i.done).length;
  const dueTodo = store.all('todo').filter(i => !i.done && i.due && i.due <= t && (!i.who || i.who === 'both' || i.who === store.me)).length;
  const badge = (tab, n) => { const b = $(`.tab[data-tab="${tab}"] .badge`); b.textContent = n || ''; b.classList.toggle('on', n > 0); };
  badge('shop', openShop); badge('todo', dueTodo);
  $('#fab').hidden = ui.tab !== 'cal';
  $('#btnToday').hidden = ui.tab !== 'cal' || ui.day === t;
  const left = $('#topLeft');
  if (ui.tab === 'cal') {
    left.replaceChildren(h('button', { class: 'month-btn', id: 'btnMonth', type: 'button', 'aria-expanded': String(ui.month), onclick: () => { ui.month = !ui.month; update(); play($('#calHead .days'), 'in-pop'); } },
      h('span', {}, fmtDay(ui.day, ui.day.slice(0, 4) === t.slice(0, 4) ? { month: 'long' } : { month: 'long', year: 'numeric' })), icon('down', ui.month ? 'flip' : '')));
  } else {
    left.replaceChildren(h('h1', {}, ui.tab === 'shop' ? 'Einkaufsliste' : 'To-dos'));
  }
  views[ui.tab].update();
  updateSync();
}

function updateSync() {
  const b = $('#syncBadge');
  if (!b) return;
  const s = store.status, n = store.pending;
  const [cls, text, label] = s === 'denied' ? ['bad', 'Kein Zugang', 'Abgleich: kein Zugang']
    : s === 'offline' || s === 'error' ? ['off', n ? `Offline · ${n}` : 'Offline', 'Abgleich: offline']
    : s === 'busy' && n ? ['busy', '', 'Abgleich läuft']
    : ['ok', '', 'Abgeglichen'];
  b.className = `sync ${cls}`;
  b.textContent = text;
  b.setAttribute('aria-label', label);
  b.dataset.state = cls;
}

// ---- Kalender ---------------------------------------------------------------------------------
const WD_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function goDay(d, closeMonth) {
  const dir = d > ui.day ? 'in-left' : d < ui.day ? 'in-right' : '';
  const wasWeek = M.mondayOf(ui.day), wasMonth = ui.day.slice(0, 7), hadMonth = ui.month;
  ui.day = d; ui.follow = d === today();
  if (closeMonth) ui.month = false;
  update();
  if (dir) play($('#calDay'), dir);
  if (hadMonth !== ui.month) play($('#calHead .days'), 'in-pop');
  else if (dir && (ui.month ? wasMonth !== d.slice(0, 7) : wasWeek !== M.mondayOf(d))) play($('#calHead .days'), dir);
}
function moveDay(n) { goDay(M.addDays(ui.day, n)); }
function moveMonth(n) { goDay(M.addMonths(ui.day, n)); }

views.cal = {
  mount(v) {
    v.append(h('div', { id: 'calHead' }), h('div', { id: 'calDay' }));
    swipe($('#calHead'), () => (ui.month ? moveMonth(1) : moveDay(7)), () => (ui.month ? moveMonth(-1) : moveDay(-7)));
    swipe($('#calDay'), () => moveDay(1), () => moveDay(-1));
  },
  update() {
    const t = today(), events = store.all('event'), todos = store.all('todo').filter(x => !x.done && x.due);
    const [y, m] = ui.day.split('-').map(Number);
    const days = ui.month ? M.monthGrid(y, m) : M.weekOf(ui.day);
    const dayBtn = d => {
      const evs = M.eventsOn(events, d);
      const dots = evs.slice(0, 3).map(e => h('i', { class: 'dot', style: whoVars(e.who) }));
      if (todos.some(x => x.due === d)) dots.push(h('i', { class: 'dot hollow' }));
      const out = ui.month && Number(d.slice(5, 7)) !== m;
      return h('button', { type: 'button', class: `d${d === ui.day ? ' sel' : ''}${d === t ? ' today' : ''}${out ? ' out' : ''}`, 'data-day': d,
        'aria-label': fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long' }) + (evs.length ? `, ${evs.length} Termine` : ''),
        onclick: () => goDay(d, true) },
        h('span', { class: 'n' }, String(Number(d.slice(8)))), h('span', { class: 'dots' }, dots.slice(0, 4)));
    };
    $('#calHead').replaceChildren(...[
      ui.month ? h('div', { class: 'month-nav' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Vorheriger Monat', onclick: () => moveMonth(-1) }, icon('left')),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Nächster Monat', onclick: () => moveMonth(1) }, icon('right'))) : null,
      h('div', { class: 'wd' }, WD_SHORT.map(w => h('span', {}, w))),
      h('div', { class: `days${ui.month ? ' grid' : ''}` }, days.map(dayBtn))].filter(Boolean));

    const list = M.eventsOn(events, ui.day);
    const allDay = list.filter(e => e.allDay), timed = list.filter(e => !e.allDay);
    const due = todos.filter(x => x.due === ui.day);
    const diff = M.dayDiff(t, ui.day);
    const rel = diff === 0 ? 'Heute' : diff === 1 ? 'Morgen' : diff === -1 ? 'Gestern' : '';
    const kids = [h('div', { class: 'day-title' }, rel ? h('b', {}, rel) : null, h('span', {}, fmtDay(ui.day, { weekday: 'long', day: 'numeric', month: 'long' })))];
    if (ui.day === t) kids.push(todayCard(events));

    if (allDay.length || due.length) {
      kids.push(h('div', { class: 'allday' },
        allDay.map(e => h('button', { type: 'button', class: 'chip-ev', style: whoVars(e.who), 'data-id': e.id, onclick: () => openEvent(e.id) },
          h('span', { class: 'emo' }, e.icon || '📌'), h('span', { class: 'grow' }, e.title), e.rep ? icon('repeat', 'small') : null)),
        due.map(x => h('div', { class: 'chip-todo', 'data-id': x.id },
          h('button', { type: 'button', class: 'check', 'aria-label': `${x.title} erledigen`, onclick: () => toggleDone(x) }),
          h('button', { type: 'button', class: 'grow', onclick: () => openTodo(x.id) }, x.title), h('span', { class: 'tag' }, 'To-do')))));
    }
    if (!timed.length) {
      kids.push(h('div', { class: 'empty' }, h('div', { class: 'empty-emo' }, allDay.length || due.length ? '🌤️' : '🗓️'),
        h('p', {}, allDay.length || due.length ? 'Sonst steht nichts an.' : 'Noch nichts geplant.'),
        h('button', { type: 'button', class: 'btn soft', onclick: () => openEvent() }, 'Termin eintragen')));
    } else {
      const now = nowMin();
      let nowShown = ui.day !== t;
      const line = () => { nowShown = true; return h('div', { class: 'now' }, h('span', {}, `Jetzt · ${M.fmtTime(now)}`)); };
      const tl = h('div', { class: 'timeline' });
      for (const r of M.dayPlan(timed)) {
        if (r.kind === 'gap') {
          if (!nowShown && now >= r.from && now < r.to) tl.append(line());
          tl.append(h('div', { class: 'gap' }, h('span', {}, `${M.fmtDur(r.min)} frei`)));
          continue;
        }
        const e = r.ev, live = ui.day === t && now >= r.start && now < r.end, past = ui.day < t || (ui.day === t && r.end <= now);
        if (!nowShown && now < r.start) tl.append(line());
        if (live) nowShown = true;
        const sub = [`${M.fmtTime(r.start)} – ${M.fmtTime(r.end)}`, e.dur ? M.fmtDur(e.dur) : null].filter(Boolean).join(' · ');
        tl.append(h('button', { type: 'button', class: `ev${past ? ' past' : ''}${live ? ' live' : ''}`, 'data-id': e.id, style: `${whoVars(e.who)};--h:${Math.round(Math.max(52, Math.min(140, 34 + (e.dur || 0) * 0.45)))}px`, onclick: () => openEvent(e.id) },
          h('span', { class: 'ev-time' }, M.fmtTime(r.start)),
          h('span', { class: 'ev-rail' }, h('span', { class: 'ev-pill' }, e.icon || '📌')),
          h('span', { class: 'ev-body' },
            h('span', { class: 'ev-title' }, e.title, e.rep ? icon('repeat', 'small') : null),
            h('span', { class: 'ev-sub' }, sub, live ? h('b', { class: 'live-tag' }, 'läuft') : null),
            h('span', { class: 'ev-meta' }, whoTag(e.who), r.overlap ? h('span', { class: 'warn' }, 'überschneidet sich') : null),
            e.note ? h('span', { class: 'ev-note' }, e.note) : null)));
      }
      if (!nowShown) tl.append(line());
      kids.push(tl);
    }
    $('#calDay').replaceChildren(...kids);
  },
};

function todayCard(events) {
  const t = today(), now = nowMin(), me = person(store.me), ot = person(M.other(store.me));
  const next = S.upNext(events, t, now);
  const openShop = store.all('shop').filter(i => !i.done).length;
  const due = store.all('todo').filter(i => !i.done && i.due && i.due <= t && (!i.who || i.who === 'both' || i.who === store.me)).length;
  const theirs = store.get(`zettel-${ot.id}`), mine = store.get(`zettel-${store.me}`);
  const free = S.freeEvening(events, t, now, 7);
  let hidden = '';
  try { hidden = localStorage.getItem('zweiplan-idee') || ''; } catch { /* egal */ }
  const n = free ? M.dayDiff(t, free) : 0;
  const when = n === 0 ? 'Heute Abend' : n === 1 ? 'Morgen Abend' : `Am ${fmtDay(free || t, { weekday: 'long' })}abend`;
  return h('section', { class: 'today-card', style: whoVars('both') },
    h('div', { class: 'hello' }, `${S.greeting(new Date().getHours())}, ${me.name}`),
    h('div', { class: 'next' }, next
      ? [h('span', { class: 'emo' }, next.ev.icon || '📌'), h('span', {}, h('b', {}, next.ev.title), next.live ? ` läuft noch ${M.fmtDur(next.min)}` : ` ${S.inText(next.min)}`)]
      : 'Heute steht nichts mehr im Kalender.'),
    h('div', { class: 'stat-row' },
      h('button', { type: 'button', class: 'stat', onclick: () => setTab('shop') }, openShop ? `🛒 ${openShop} ${openShop === 1 ? 'fehlt' : 'fehlen'}` : '🛒 Liste leer'),
      h('button', { type: 'button', class: 'stat', onclick: () => setTab('todo') }, due ? `✅ ${due} fällig` : '✅ nichts fällig'),
      S.countdowns(events, t).map(c => h('button', { type: 'button', class: 'stat count', onclick: () => goDay(c.date) }, `${c.ev.icon || '📌'} ${c.ev.title} ${S.daysText(c.days)}`))),
    theirs && theirs.text ? h('div', { class: 'zettel' }, h('span', { class: 'emo' }, '💌'), h('span', {}, h('b', {}, `${ot.name}: `), theirs.text)) : null,
    ot.named ? h('button', { type: 'button', class: 'zettel-btn', id: 'zettelBtn', onclick: openZettel }, mine && mine.text ? `Dein Zettel: „${mine.text}“` : `💬 Zettel für ${ot.name} schreiben`)
      : h('button', { type: 'button', class: 'zettel-btn', onclick: openSettings }, '👋 Zweites Handy verbinden: Paar-Code anzeigen'),
    bellPrompt(),
    ot.named && free && hidden !== free ? h('div', { class: 'idea' },
      h('span', { class: 'grow' }, `💡 ${when} ist noch frei.`),
      h('button', { type: 'button', class: 'link', onclick: () => openEvent(null, { date: free, start: 19 * 60, dur: 120, who: 'both', icon: '❤️' }) }, 'Planen'),
      h('button', { type: 'button', class: 'link muted', 'aria-label': 'Hinweis ausblenden', onclick: () => { try { localStorage.setItem('zweiplan-idee', free); } catch { /* egal */ } update(); } }, '✕')) : null);
}

// Einmaliges Angebot auf der Heute-Karte: Mitteilungen einschalten
function bellPrompt() {
  let no = false;
  try { no = localStorage.getItem('zweiplan-glocke') === '1'; } catch { /* egal */ }
  if (no || !Push.supported() || Push.isOn() || Notification.permission === 'denied') return null;
  const hide = () => { try { localStorage.setItem('zweiplan-glocke', '1'); } catch { /* egal */ } };
  return h('div', { class: 'idea' },
    h('span', { class: 'grow' }, '🔔 Mitteilungen bekommen?'),
    h('button', { type: 'button', class: 'link', id: 'bellBtn', onclick: async () => { const r = await Push.enable(store, true); hide(); toast(PUSH_TEXT[r]); update(); planSoon(); } }, 'Einschalten'),
    h('button', { type: 'button', class: 'link muted', 'aria-label': 'Nicht jetzt', onclick: () => { hide(); update(); } }, '✕'));
}
const PUSH_TEXT = { ok: 'Mitteilungen sind an 🔔', denied: 'Mitteilungen sind für diese App gesperrt (Einstellungen des Handys)', unsupported: 'Auf dem iPhone: erst zum Home-Bildschirm hinzufügen', offline: 'Gerade keine Verbindung', error: 'Das hat nicht geklappt' };

function openZettel() {
  const id = `zettel-${store.me}`, ot = person(M.other(store.me)), old = store.get(id);
  const text = h('textarea', { rows: 3, maxLength: 140, placeholder: 'z. B. Denk an dich ❤️ · Bringst du Brötchen mit?', value: (old && old.text) || '' });
  const save = v => { store.put({ id, t: 'zettel', text: v.trim() }); closeSheet(); if (v.trim()) toast('Zettel liegt bereit'); };
  openSheet(`Zettel für ${ot.name}`,
    h('p', { class: 'hint' }, `${ot.name} sieht ihn oben auf der Heute-Karte.`), text,
    h('div', { class: 'actions' }, old && old.text ? h('button', { type: 'button', class: 'btn danger', onclick: () => save('') }, 'Wegnehmen') : null,
      h('button', { type: 'button', class: 'btn primary', id: 'saveBtn', onclick: () => save(text.value) }, 'Hinlegen')));
  setTimeout(() => text.focus(), 60);
}

function openEvent(id, preset) {
  const old = id ? store.get(id) : null;
  if (id && !old) return;
  const soon = Math.min(23 * 60, Math.ceil((nowMin() + 1) / 30) * 30);
  const f = old ? { ...old } : { title: '', icon: '📌', date: ui.day, allDay: false, start: ui.day === today() ? soon : 9 * 60, dur: 60, who: store.me, rep: '', note: '', ...(preset || {}) };
  let iconFixed = !!old || !!(preset && preset.icon);
  const touched = {};                 // was von Hand gesetzt wurde, überschreibt die Schnelleingabe nicht mehr
  let quick = { title: f.title };

  const iconBtn = h('button', { type: 'button', class: 'emo-btn', 'aria-label': 'Symbol wählen', onclick: () => { grid.hidden = !grid.hidden; } }, f.icon);
  const magic = h('div', { class: 'magic', hidden: true });
  const title = h('input', { type: 'text', class: 'title-in', placeholder: old ? 'Titel' : 'z. B. Kino Freitag 20 Uhr', value: f.title, maxLength: 120, enterKeyHint: 'done', autocomplete: 'off',
    oninput: () => {
      f.title = title.value; title.classList.remove('err');
      if (!old) {       // Schnelleingabe: Datum, Uhrzeit und Dauer aus dem Text übernehmen
        quick = S.parseQuick(f.title, today());
        if (quick.date && !touched.date) { f.date = quick.date; date.value = f.date; }
        if (quick.start !== undefined && !touched.time) { f.start = quick.start; if (f.allDay) { f.allDay = false; allDayBox.checked = false; times.hidden = false; } }
        if (quick.dur && !touched.time) f.dur = quick.dur;
        sync();
        const d = S.describeQuick(quick, today(), x => fmtDay(x, { weekday: 'short', day: 'numeric', month: 'numeric' }), M.fmtTime);
        magic.hidden = !d; magic.textContent = d ? `✨ Erkannt: ${d}` : '';
      }
      if (!iconFixed) { f.icon = M.guessIcon(old ? f.title : quick.title); iconBtn.textContent = f.icon; }
    },
    onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } } });
  const grid = h('div', { class: 'emo-grid', hidden: true }, M.ICONS.map(i =>
    h('button', { type: 'button', onclick: () => { f.icon = i; iconFixed = true; iconBtn.textContent = i; grid.hidden = true; } }, i)));

  if (!Number.isInteger(f.rem)) f.rem = old ? 30 : remDefault();
  const rem = h('select', { 'aria-label': 'Erinnern', onchange: () => { f.rem = Number(rem.value); } }, S.REMINDERS.map(([v, l]) => h('option', { value: String(v), selected: v === f.rem }, l)));
  const date = h('input', { type: 'date', value: f.date, 'aria-label': 'Datum', onchange: () => { touched.date = true; if (date.value) f.date = date.value; else date.value = f.date; } });
  const durLabel = h('span', { class: 'dur-label' });
  const start = h('input', { type: 'time', value: M.fmtTime(f.start), 'aria-label': 'Beginn', onchange: () => { touched.time = true; const v = M.parseTime(start.value); if (v !== null) f.start = v; sync(); } });
  const end = h('input', { type: 'time', value: M.fmtTime(f.start + f.dur), 'aria-label': 'Ende', onchange: () => {
    touched.time = true;
    const v = M.parseTime(end.value);
    if (v !== null) f.dur = v > f.start ? v - f.start : v + 1440 - f.start;
    sync();
  } });
  const durs = seg([[15, '15 Min.'], [30, '30 Min.'], [45, '45 Min.'], [60, '1 Std.'], [90, '1,5 Std.'], [120, '2 Std.'], [180, '3 Std.']], f.dur, v => { touched.time = true; f.dur = v; sync(); }, 'chips');
  function sync() {
    start.value = M.fmtTime(f.start); end.value = M.fmtTime(f.start + f.dur);
    durLabel.textContent = `Dauer: ${M.fmtDur(f.dur)}${f.start + f.dur > 1440 ? ' (bis zum nächsten Tag)' : ''}`;
    durs.set(f.dur);
  }
  const times = h('div', { class: 'times', hidden: f.allDay },
    h('div', { class: 'two' }, field('Beginn', start), field('Ende', end)), durs, durLabel, field('Erinnern', rem));
  sync();
  const allDayBox = h('input', { type: 'checkbox', checked: !!f.allDay, onchange: () => { f.allDay = allDayBox.checked; times.hidden = f.allDay; } });
  const allDay = h('label', { class: 'switch' }, allDayBox, h('span', {}, 'Ganztägig'));
  const pin = h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: !!f.pin, onchange: e => { f.pin = e.target.checked; } }), h('span', {}, 'Countdown auf der Heute-Karte'));
  const rep = h('select', { 'aria-label': 'Wiederholen', onchange: () => { f.rep = rep.value; } }, M.REPEATS.map(([v, l]) => h('option', { value: v, selected: v === (f.rep || '') }, l)));
  const note = h('textarea', { rows: 2, placeholder: 'Notiz (optional)', maxLength: 600, value: f.note || '', oninput: () => { f.note = note.value; } });

  const save = () => {
    const t = (old ? f.title : quick.title || '').trim();
    if (!t) { title.classList.add('err'); title.focus(); return; }
    const fields = { ...(old ? { id: old.id } : { by: store.me }), t: 'event', title: t, icon: f.icon, date: f.date, allDay: !!f.allDay, start: f.start, dur: f.dur, who: f.who, rep: f.rep || '', until: f.until || '', pin: !!f.pin, rem: f.rem, note: (f.note || '').trim() };
    const it = store.put(Object.assign(fields));
    ui.day = f.date; ui.follow = f.date === today();
    closeSheet(); update();
    play($(`.ev[data-id="${it.id}"], .chip-ev[data-id="${it.id}"]`), 'in-pop');
  };
  openSheet(old ? 'Termin bearbeiten' : 'Neuer Termin',
    h('div', { class: 'title-row' }, iconBtn, title), magic, grid,
    field('Für wen?', seg(whoOptions(), f.who, v => { f.who = v; })),
    h('div', { class: 'two' }, field('Datum', date), field('Wiederholen', rep)),
    allDay, times, pin, note,
    h('div', { class: 'actions' },
      old ? confirmBtn('Löschen', old.rep ? 'Ganze Serie löschen?' : 'Wirklich löschen?', () => { store.remove(old.id); closeSheet(); }) : null,
      h('button', { type: 'button', class: 'btn primary', id: 'saveBtn', onclick: save }, old ? 'Speichern' : 'Eintragen')));
  if (!old) setTimeout(() => title.focus(), 60);
}

// ---- gemeinsame Zeilen für Einkauf und To-dos -------------------------------------------------
function toggleDone(it) {
  if (it.t === 'todo' && !it.done && it.rep) {       // wiederkehrende Aufgabe: springt auf den nächsten Termin
    const due = S.nextDue(it.due, it.rep, today());
    store.put({ id: it.id, due });
    return toast(`Erledigt 🎉 Wieder fällig: ${M.dueLabel(due, today()).text}`);
  }
  store.put({ id: it.id, done: !it.done, doneAt: it.done ? 0 : Date.now(), ...(it.t === 'shop' && !it.done ? { n: (it.n || 0) + 1 } : {}) });
}
function row(it, { meta, onOpen, title = it.title, lead }) {
  const key = `${it.id}:${it.done ? 1 : 0}`, fresh = known.ready && !known.set.has(key);
  known.next.add(key);
  return h('div', { class: `row${it.done ? ' done' : ''}${fresh ? ' new' : ''}`, 'data-id': it.id },
    h('button', { type: 'button', class: `check${it.done ? ' on' : ''}`, 'aria-label': it.done ? `${it.title} wieder öffnen` : `${it.title} abhaken`, 'aria-pressed': String(!!it.done), onclick: () => toggleDone(it) }, it.done ? icon('check') : null),
    h('button', { type: 'button', class: 'row-main', onclick: onOpen }, h('span', { class: 'row-title' }, lead ? h('b', { class: 'qty' }, lead) : null, title), meta && meta.length ? h('span', { class: 'row-meta' }, meta) : null));
}
function quickAdd(placeholder, onAdd, onType) {
  const input = h('input', { type: 'text', placeholder, maxLength: 160, enterKeyHint: 'done', autocomplete: 'off', autocapitalize: 'sentences', 'aria-label': placeholder, oninput: () => onType && onType(input.value) });
  return h('form', { class: 'quick', onsubmit: e => { e.preventDefault(); const v = input.value.trim(); if (!v) { input.focus(); return; } input.value = ''; onAdd(v); if (onType) onType(''); input.focus(); } },
    input, h('button', { type: 'submit', class: 'add', 'aria-label': 'Hinzufügen' }, icon('plus')));
}
const section = (title, right, items) => [h('div', { class: 'sec' }, h('span', {}, title), right), h('div', { class: 'card' }, items)];

// ---- Einkaufsliste ----------------------------------------------------------------------------
let shopTyped = '';
function addShop(title) {
  const same = store.all('shop').find(i => i.title.toLowerCase() === title.toLowerCase());
  if (same && !same.done) return toast(`„${same.title}“ steht schon drauf`);
  if (same) store.put({ id: same.id, done: false, doneAt: 0, by: store.me, c: Date.now() });
  else store.put({ t: 'shop', title, done: false, by: store.me });
}
views.shop = {
  mount(v) {
    shopTyped = '';
    // mehrere auf einmal: „Milch, Brot, Eier“
    v.append(quickAdd('Was fehlt? z. B. Milch, Brot', text => { for (const part of text.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)) addShop(part.slice(0, 120)); },
      typed => { shopTyped = typed; views.shop.suggest(); }), h('div', { id: 'shopSuggest', class: 'suggest' }), h('div', { id: 'shopList' }));
  },
  suggest() {
    const list = S.suggestShop(store.all('shop'), shopTyped.split(/[,;]/).pop());
    $('#shopSuggest').replaceChildren(...(list.length ? [h('span', { class: 'suggest-label' }, shopTyped ? 'Meinst du' : 'Oft gekauft'),
      ...list.map(i => h('button', { type: 'button', onclick: () => { addShop(i.title); const inp = $('.quick input'); if (shopTyped && inp) { inp.value = ''; shopTyped = ''; } } }, `＋ ${i.title}`))] : []));
  },
  update() {
    const all = store.all('shop');
    const open = all.filter(i => !i.done);
    const done = all.filter(i => i.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 40);
    const mk = i => { const q = S.splitQty(i.title); return row(i, { title: q.name, lead: q.qty, meta: i.by && i.by !== store.me && !i.done ? [whoTag(i.by)] : null, onOpen: () => openShop(i.id) }); };
    const kids = [];
    views.shop.suggest();
    if (open.length) for (const g of S.groupShop(open)) kids.push(h('div', { class: 'sec aisle' }, h('span', {}, `${g.emoji} ${g.label}`)), h('div', { class: 'card' }, g.items.map(mk)));
    else kids.push(h('div', { class: 'empty' }, h('div', { class: 'empty-emo' }, '🛒'), h('p', {}, done.length ? 'Alles eingekauft!' : 'Die Liste ist leer. Schreib oben auf, was fehlt.')));
    if (done.length) kids.push(...section(`Erledigt (${done.length})`,
      confirmBtn('Aufräumen', 'Alle entfernen?', () => { for (const i of done) store.remove(i.id); toast('Erledigte entfernt'); }, 'link'), done.map(mk)));
    $('#shopList').replaceChildren(...kids);
    knownDone();
  },
};

function openShop(id) {
  const it = store.get(id);
  if (!it) return;
  const title = h('input', { type: 'text', class: 'title-in', value: it.title, maxLength: 120, enterKeyHint: 'done', onkeydown: e => { if (e.key === 'Enter') save(); } });
  const save = () => { const t = title.value.trim(); if (!t) return title.focus(); if (t !== it.title) store.put({ id, title: t }); closeSheet(); };
  openSheet('Eintrag', h('div', { class: 'title-row' }, title),
    it.by ? h('p', { class: 'hint' }, `Aufgeschrieben von ${person(it.by).name}`) : null,
    h('div', { class: 'actions' }, confirmBtn('Löschen', 'Wirklich löschen?', () => { store.remove(id); closeSheet(); }), h('button', { type: 'button', class: 'btn primary', onclick: save }, 'Speichern')));
}

// ---- To-dos -----------------------------------------------------------------------------------
views.todo = {
  mount(v) {
    v.append(
      quickAdd('Neue Aufgabe, z. B. Müll morgen', text => {
        const q = S.parseQuick(text, today());      // ein Datum im Text wird zur Fälligkeit
        store.put({ t: 'todo', title: q.title, done: false, who: ui.filter || '', due: q.date || '', rep: '', note: '', by: store.me });
        if (q.date) toast(`Fällig: ${M.dueLabel(q.date, today()).text}`);
      }),
      h('div', { id: 'todoFilter' }), h('div', { id: 'todoList' }));
  },
  update() {
    const me = store.me, ot = M.other(me);
    if (!$('#todoFilter').firstChild || $('#todoFilter').dataset.names !== person(me).name + person(ot).name) {
      $('#todoFilter').dataset.names = person(me).name + person(ot).name;
      $('#todoFilter').replaceChildren(seg([['', 'Alle'], [me, 'Meine'], [ot, person(ot).name]], ui.filter, v => { ui.filter = v; views.todo.update(); }));
    }
    const groups = M.groupTodos(store.all('todo'), today(), ui.filter);
    const mk = x => {
      const meta = [];
      if (x.due && !x.done) { const d = M.dueLabel(x.due, today()); meta.push(h('span', { class: `due${d.late ? ' late' : ''}` }, d.text)); }
      if (x.rep) meta.push(h('span', { class: 'note-mark' }, (S.TODO_REPEATS.find(r => r[0] === x.rep) || ['', ''])[1]));
      if (x.who) meta.push(whoTag(x.who));
      if (x.note) meta.push(h('span', { class: 'note-mark' }, 'Notiz'));
      return row(x, { meta, onOpen: () => openTodo(x.id) });
    };
    const kids = groups.flatMap(g => section(g.title, g.key === 'done'
      ? confirmBtn('Aufräumen', 'Alle entfernen?', () => { for (const x of store.all('todo').filter(x => x.done)) store.remove(x.id); toast('Erledigte entfernt'); }, 'link') : null, g.items.map(mk)).map(el => (el.classList.add(`g-${g.key}`), el)));
    if (!groups.some(g => g.key !== 'done')) kids.unshift(h('div', { class: 'empty' }, h('div', { class: 'empty-emo' }, '✅'), h('p', {}, ui.filter ? 'Hier ist nichts offen.' : 'Nichts offen. Schreib oben eine Aufgabe auf.')));
    $('#todoList').replaceChildren(...kids);
    knownDone();
  },
};

function openTodo(id) {
  const it = store.get(id);
  if (!it) return;
  const f = { ...it };
  const title = h('input', { type: 'text', class: 'title-in', value: f.title, maxLength: 120, enterKeyHint: 'done', oninput: () => { f.title = title.value; }, onkeydown: e => { if (e.key === 'Enter') title.blur(); } });
  const date = h('input', { type: 'date', value: f.due || '', 'aria-label': 'Fällig am', onchange: () => { f.due = date.value || ''; quick.set(f.due); } });
  const t = today();
  const quick = seg([['', 'Kein Datum'], [t, 'Heute'], [M.addDays(t, 1), 'Morgen'], [M.addDays(M.mondayOf(t), 5), 'Samstag']], f.due || '', v => { f.due = v; date.value = v; }, 'chips');
  const note = h('textarea', { rows: 2, placeholder: 'Notiz (optional)', maxLength: 600, value: f.note || '', oninput: () => { f.note = note.value; } });
  const save = () => {
    const tt = f.title.trim();
    if (!tt) return title.focus();
    store.put({ id, title: tt, who: f.who || '', due: f.due || (f.rep ? today() : ''), rep: f.rep || '', note: (f.note || '').trim() });
    closeSheet();
  };
  const rep = h('select', { 'aria-label': 'Wiederholen', onchange: () => { f.rep = rep.value; } }, S.TODO_REPEATS.map(([v, l]) => h('option', { value: v, selected: v === (f.rep || '') }, l)));
  openSheet('Aufgabe', h('div', { class: 'title-row' }, title),
    field('Wer macht das?', seg([['', 'Egal'], ...whoOptions('Beide')], f.who || '', v => { f.who = v; })),
    field('Fällig', quick, h('div', { class: 'two' }, date, rep)), note,
    h('div', { class: 'actions' }, confirmBtn('Löschen', 'Wirklich löschen?', () => { store.remove(id); closeSheet(); }), h('button', { type: 'button', class: 'btn primary', id: 'saveBtn', onclick: save }, 'Speichern')));
}

// ---- Einstellungen ----------------------------------------------------------------------------
async function shareCode() {
  const text = `Unser Paar-Code für die Home-App: ${M.fmtCode(store.cfg.code)}\nApp: ${location.origin}${location.pathname}`;
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); toast('Kopiert'); }
  } catch { /* abgebrochen */ }
}
const codeBox = () => h('div', { class: 'code-box' },
  h('div', { class: 'code', id: 'pairCode' }, M.fmtCode(store.cfg.code)),
  h('div', { class: 'two' },
    h('button', { type: 'button', class: 'btn soft', onclick: async () => { try { await navigator.clipboard.writeText(M.fmtCode(store.cfg.code)); toast('Code kopiert'); } catch { toast('Bitte von Hand abtippen'); } } }, 'Kopieren'),
    h('button', { type: 'button', class: 'btn soft', onclick: shareCode }, 'Teilen')));

const remDefault = () => { const p = store.get(store.me); return p && Number.isInteger(p.rem) ? p.rem : 30; };
const savePerson = fields => store.put({ id: store.me, t: 'person', ...fields });
const group = (title, ...kids) => h('section', { class: 'set' }, h('h3', {}, title), h('div', { class: 'set-body' }, kids));

function openSettings() {
  const me = person(store.me), ot = person(M.other(store.me)), mine = store.get(store.me) || {};
  const name = h('input', { type: 'text', value: me.named ? me.name : '', placeholder: 'Dein Name', maxLength: 24, 'aria-label': 'Dein Name', onchange: () => { const v = name.value.trim(); if (v) savePerson({ name: v }); } });
  const colors = seg(M.COLORS.map(c => [c, '', `--c:${c}`]), me.color, c => savePerson({ color: c }), 'swatches');

  const theme = seg([['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']], prefs.theme, v => { prefs.theme = v; applyPrefs(true); });
  const looks = h('div', { class: 'looks' });
  const drawLooks = () => looks.replaceChildren(...LOOKS.map(([id, label, color]) =>
    h('button', { type: 'button', class: id === prefs.look ? 'on' : '', style: `--c:${color}`, 'aria-pressed': String(id === prefs.look), onclick: () => { prefs.look = id; applyPrefs(true); drawLooks(); } }, h('i', {}), h('span', {}, label))));
  drawLooks();

  // Mitteilungen
  const can = Push.supported();
  const pushBox = h('input', { type: 'checkbox', id: 'pushSwitch', checked: Push.isOn(), disabled: !can, onchange: async () => {
    if (pushBox.checked) { const r = await Push.enable(store, true); pushBox.checked = r === 'ok'; toast(PUSH_TEXT[r]); planSoon(); } else { await Push.disable(store); toast('Mitteilungen sind aus'); }
  } });
  const sumNow = Number.isInteger(mine.sum) ? mine.sum : 480;
  const sum = h('select', { 'aria-label': 'Tagesüberblick', onchange: () => savePerson({ sum: Number(sum.value) }) },
    [[-1, 'Aus'], [360, '6:00 Uhr'], [390, '6:30 Uhr'], [420, '7:00 Uhr'], [450, '7:30 Uhr'], [480, '8:00 Uhr'], [540, '9:00 Uhr'], [600, '10:00 Uhr']].map(([v, l]) => h('option', { value: String(v), selected: v === sumNow }, l)));
  const remSel = h('select', { 'aria-label': 'Erinnerung vor Terminen', onchange: () => savePerson({ rem: Number(remSel.value) }) },
    S.REMINDERS.map(([v, l]) => h('option', { value: String(v), selected: v === remDefault() }, l)));

  const last = store.lastOk ? new Date(store.lastOk).toLocaleString('de-DE', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'noch nie';
  const state = h('p', { class: 'hint', id: 'syncInfo' }, store.status === 'denied' ? 'Der Dienst kennt diesen Planer nicht (mehr).' : `Zuletzt abgeglichen: ${last}${store.pending ? ` · ${store.pending} Änderung(en) warten` : ''}`);
  openSheet('Einstellungen',
    group('Du', name, colors),
    group('Aussehen', theme, looks),
    group('Mitteilungen',
      h('label', { class: 'switch' }, pushBox, h('span', {}, 'Mitteilungen auf diesem Gerät')),
      can ? h('p', { class: 'hint' }, `Du bekommst Bescheid, wenn ${ot.named ? ot.name : 'der andere'} etwas einträgt, vor Terminen und morgens mit dem Tagesüberblick.`)
        : h('p', { class: 'hint box' }, 'Hier nicht möglich. Auf dem iPhone: in Safari auf „Teilen“ → „Zum Home-Bildschirm“, die App von dort öffnen und dann hier einschalten.'),
      h('div', { class: 'two' }, field('Tagesüberblick', sum), field('Vor Terminen', remSel))),
    group('Zu zweit', h('p', { class: 'hint' }, ot.named ? [h('i', { class: 'dot', style: `--c1:${ot.color};--c2:${ot.color}` }), ` ${ot.name} ist dabei.`] : 'Noch allein hier. Gib den Paar-Code weiter – auf dem zweiten Handy „Ich habe einen Paar-Code“ wählen.'), codeBox()),
    group('Abgleich', state, h('button', { type: 'button', class: 'btn soft', onclick: async () => { const ok = await store.sync(); toast(ok ? 'Abgeglichen' : 'Gerade keine Verbindung'); } }, 'Jetzt abgleichen')),
    group('Dieses Gerät',
      h('p', { class: 'hint' }, 'Aufs iPhone: in Safari auf „Teilen“ und „Zum Home-Bildschirm“. Die App vom Home-Bildschirm hat einen eigenen Speicher – dort den Paar-Code noch einmal eingeben.'),
      h('button', { type: 'button', class: 'btn soft', id: 'introAgain', onclick: () => { closeSheet(true); openIntro(false); } }, 'Einführung noch einmal ansehen'),
      confirmBtn('Abmelden', 'Wirklich abmelden? Die Einträge bleiben beim Dienst.', async () => { closeSheet(true); await Push.disable(store); store.leave(); }, 'btn danger wide')));
}

// ---- Einführung (einmal je Gerät, später unter Einstellungen) -----------------------------------
const INTRO = [
  ['🗓️', 'Euer gemeinsamer Kalender', 'Tippe auf das Plus und schreib einfach los: „Kino Freitag 20 Uhr“. Datum und Uhrzeit erkennt die App von selbst. Jeder Termin gehört dir, dem anderen oder euch beiden.'],
  ['🛒', 'Eine Einkaufsliste für beide', 'Schreib auf, was fehlt – gern mehrere Sachen auf einmal: „Milch, Brot, Eier“. Die Liste sortiert sich nach Regalen, und was einer abhakt, ist bei beiden abgehakt.'],
  ['✅', 'To-dos mit Datum und Person', '„Müll rausbringen morgen“ genügt. Aufgaben lassen sich zuweisen, und Wiederkehrendes springt nach dem Abhaken von selbst auf den nächsten Termin.'],
  ['💌', 'Die Heute-Karte', 'Ganz oben steht, was als Nächstes kommt und wie viele Tage es noch bis zum Urlaub sind. Dort kannst du auch einen kleinen Zettel für den anderen hinlegen.'],
  ['🔔', 'Nichts verpassen', 'Mit Mitteilungen erfährst du, wenn der andere etwas einträgt, und wirst an Termine erinnert. Das und die Farben findest du oben rechts in den Einstellungen.'],
];
const introSeen = () => { try { return localStorage.getItem('zweiplan-intro') === '1'; } catch { return true; } };
function openIntro(withCode) {
  document.querySelector('.intro')?.remove();
  const pages = withCode ? [...INTRO, ['👋', 'Jetzt zu zweit', 'Das ist euer Paar-Code. Auf dem zweiten Handy die App öffnen, „Ich habe einen Paar-Code“ wählen und ihn eintippen. Du findest ihn später in den Einstellungen wieder.']] : INTRO;
  let i = 0;
  const card = h('div', { class: 'intro-card' });
  const dots = h('div', { class: 'intro-dots' });
  const next = h('button', { type: 'button', class: 'btn primary', id: 'introNext', onclick: () => go(i + 1) });
  const skip = h('button', { type: 'button', class: 'link', id: 'introSkip', onclick: () => go(withCode ? pages.length - 1 : pages.length) }, 'Überspringen');
  const wrap = h('div', { class: 'intro', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Einführung' }, h('div', { class: 'intro-top' }, skip), card, dots, h('div', { class: 'intro-actions' }, next));
  function go(n) {
    if (n >= pages.length) {
      try { localStorage.setItem('zweiplan-intro', '1'); } catch { /* egal */ }
      wrap.classList.add('out');
      return setTimeout(() => wrap.remove(), 260);
    }
    const dir = n < i ? 'in-right' : 'in-left';
    i = Math.max(0, n);
    const [emo, title, text] = pages[i], last = i === pages.length - 1;
    card.replaceChildren(h('div', { class: 'intro-emo' }, emo), h('h2', {}, title), h('p', {}, text), ...(last && withCode ? [codeBox()] : []));
    dots.replaceChildren(...pages.map((_, k) => h('i', { class: k === i ? 'on' : '' })));
    next.textContent = last ? 'Los geht’s' : 'Weiter';
    skip.style.visibility = last ? 'hidden' : '';
    play(card, dir);
  }
  swipe(wrap, () => { if (i < pages.length - 1) go(i + 1); }, () => { if (i > 0) go(i - 1); });
  document.body.append(wrap);
  go(0);
}

// ---- Einrichtung ------------------------------------------------------------------------------
function chooseMe(name) {
  const p1 = store.get('p1'), p2 = store.get('p2'), same = p => p && p.name && p.name.toLowerCase() === name.toLowerCase();
  const take = (p, fresh) => { store.setMe(p); if (fresh) store.put({ id: p, t: 'person', name, color: p === 'p1' ? M.COLORS[0] : M.COLORS[4] }); };
  if (same(p1)) return take('p1');
  if (same(p2)) return take('p2');
  if (!p1 || !p1.name) return take('p1', true);
  if (!p2 || !p2.name) return take('p2', true);
  render();   // beide Plätze vergeben: nachfragen
}

function setupScreen() {
  closeSheet(true);
  ui.tab = 'cal'; ui.day = today(); ui.follow = true; ui.month = false; ui.filter = '';
  let busy = false;
  const name = h('input', { type: 'text', id: 'setupName', placeholder: 'Dein Name', maxLength: 24, autocomplete: 'given-name', 'aria-label': 'Dein Name' });
  const code = h('input', { type: 'text', id: 'setupCode', placeholder: 'XXXX-XXXX-XXXX-XXXX', maxLength: 24, autocomplete: 'off', autocapitalize: 'characters', spellcheck: false, 'aria-label': 'Paar-Code' });
  const msg = h('p', { class: 'msg', role: 'alert' });
  const joinBox = h('div', { class: 'join', hidden: true }, code, h('button', { type: 'button', class: 'btn primary', id: 'joinBtn', onclick: () => go(false) }, 'Beitreten'));
  const TEXT = { offline: 'Keine Verbindung. Bitte Internet prüfen und noch einmal versuchen.', unknown: 'Diesen Code kennt der Dienst nicht. Bitte genau abtippen.', error: 'Das hat nicht geklappt. Bitte gleich noch einmal versuchen.', taken: 'Bitte noch einmal versuchen.' };
  async function go(create) {
    if (busy) return;
    const n = name.value.trim();
    if (!n) { msg.textContent = 'Bitte zuerst deinen Namen eintragen.'; return name.focus(); }
    const c = create ? M.newCode() : M.normCode(code.value);
    if (!c) { msg.textContent = 'Der Code hat 16 Zeichen (Buchstaben und Ziffern).'; return code.focus(); }
    busy = true; msg.textContent = 'Einen Moment …';
    const r = create ? await store.create(c) : await store.join(c);
    busy = false;
    if (r !== 'ok') { msg.textContent = TEXT[r] || TEXT.error; return; }
    chooseMe(n);
    render();
    if (store.me && (create || !introSeen())) openIntro(create);
  }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone;
  root.replaceChildren(h('div', { class: 'setup' },
    h('img', { class: 'logo', src: 'icons/icon-192.png', alt: '', width: 88, height: 88 }),
    h('h1', {}, 'Home'),
    h('p', { class: 'lead' }, 'Ein Kalender, ein Einkaufszettel und eine To-do-Liste – für euch beide, auf beiden Handys gleich.'),
    ios ? h('p', { class: 'hint box' }, 'Tipp: Erst in Safari auf „Teilen“ und „Zum Home-Bildschirm“ tippen, die App von dort öffnen und dann hier weitermachen.') : null,
    name,
    h('button', { type: 'button', class: 'btn primary', id: 'createBtn', onclick: () => go(true) }, 'Neuen Planer anlegen'),
    h('button', { type: 'button', class: 'btn soft', id: 'haveCodeBtn', onclick: () => { joinBox.hidden = false; code.focus(); } }, 'Ich habe einen Paar-Code'),
    joinBox, msg));
}

function whoScreen() {
  const name = h('input', { type: 'text', placeholder: 'Dein Name', maxLength: 24, 'aria-label': 'Dein Name' });
  const btn = p => { const it = store.get(p); return it && it.name ? h('button', { type: 'button', class: 'btn soft', onclick: () => { store.setMe(p); } }, `Ich bin ${it.name}`) : null; };
  const free = ['p1', 'p2'].find(p => !(store.get(p) || {}).name);
  root.replaceChildren(h('div', { class: 'setup' }, h('h1', {}, 'Wer bist du?'),
    h('p', { class: 'lead' }, 'Damit Termine und Aufgaben der richtigen Person gehören.'),
    btn('p1'), btn('p2'),
    free ? [name, h('button', { type: 'button', class: 'btn primary', onclick: () => { const n = name.value.trim(); if (!n) return name.focus(); store.setMe(free); store.put({ id: free, t: 'person', name: n, color: free === 'p1' ? M.COLORS[0] : M.COLORS[4] }); } }, 'Weiter')] : null,
    h('button', { type: 'button', class: 'link', onclick: () => store.leave() }, 'Abbrechen')));
}

// ---- Ablauf -----------------------------------------------------------------------------------
function render() {
  if (!store.cfg) return setupScreen();
  if (!store.me) return whoScreen();
  if (!$('#view')) { buildShell(); setTab(ui.tab); } else update();
}
// Wer die App schon eingerichtet hat, sieht die Einführung beim nächsten Start einmal
function introOnce() {
  if (store.cfg && store.me && !introSeen() && !document.querySelector('.intro')) openIntro(false);
}

// Abgleich: kurz nach jeder Änderung, beim Zurückkommen in die App, wenn das Netz wiederkommt,
// sofort wenn der Dienst „Neues“ meldet (WebSocket), und zur Sicherheit alle 45 Sekunden.
let pushTimer, ws = null, wsRetry = 0, wsTimer, gotPong = true;
function connect() {
  if (ws || !store.cfg || document.hidden || !navigator.onLine) return;
  let sock;
  try { sock = new WebSocket(`${API.replace(/^http/, 'ws')}/s/${store.cfg.spaceId}/ws?d=${store.dev}`); } catch { return; }
  ws = sock; gotPong = true;
  sock.onopen = () => { wsRetry = 0; };
  sock.onmessage = e => { gotPong = true; const n = Number(e.data); if (store.cfg && n > (store.cfg.seq || 0)) store.sync(); };
  sock.onclose = () => { if (ws === sock) ws = null; clearTimeout(wsTimer); wsTimer = setTimeout(connect, Math.min(30000, 1500 * 2 ** wsRetry++)); };
  sock.onerror = () => { try { sock.close(); } catch { /* schon zu */ } };
}
function disconnect() { clearTimeout(wsTimer); if (ws) { const s = ws; ws = null; s.onclose = null; try { s.close(); } catch { /* schon zu */ } } }

// Kurzer Hinweis, wenn der andere gerade etwas eingetragen oder abgehakt hat
function remoteToast(list) {
  const theirs = list.filter(c => c.it.m && c.it.m !== store.me && !c.it.x && c.it.t !== 'person');
  if (!theirs.length) return;
  const who = person(theirs[0].it.m).name;
  if (theirs.length > 1) return toast(`${who} hat ${theirs.length} Einträge geändert`);
  const { old, it } = theirs[0];
  const text = it.t === 'zettel' ? (it.text ? `💌 Neuer Zettel von ${who}` : null)
    : it.t === 'shop' ? (!old || (old.done && !it.done) ? `🛒 ${who}: „${it.title}“ fehlt` : it.done && !old.done ? `${who} hat „${it.title}“ eingekauft` : null)
    : it.t === 'event' ? (!old ? `🗓️ ${who}: neuer Termin „${it.title}“` : `${who} hat „${it.title}“ geändert`)
    : it.t === 'todo' ? (!old ? `✅ ${who}: neue Aufgabe „${it.title}“` : it.done && !old.done ? `${who} hat „${it.title}“ erledigt` : null) : null;
  if (text) toast(text);
}

// Erinnerungsplan (Termine, Tagesüberblick) beim Dienst ablegen – nur wenn er sich geändert hat
let planTimer;
function planSoon() {
  if (planTimer) return;                   // läuft schon: nicht immer wieder hinausschieben
  planTimer = setTimeout(async () => {
    planTimer = null;
    if (!store.cfg || !store.me || document.hidden) return;
    if (store.pending) return planSoon();  // erst hochladen lassen, dann planen
    const plan = S.buildPlan(store.everything());
    const sig = `${store.cfg.spaceId}:${JSON.stringify(plan)}`;
    let last = '';
    try { last = localStorage.getItem('zweiplan-plan') || ''; } catch { /* egal */ }
    if (sig !== last && await store.post('plan', { plan })) try { localStorage.setItem('zweiplan-plan', sig); } catch { /* egal */ }
  }, 1500);
}

store.on((what, detail) => {
  if (what === 'remote') remoteToast(detail);
  if (what === 'data' || what === 'status') planSoon();
  if (what === 'local') { clearTimeout(pushTimer); pushTimer = setTimeout(() => store.sync(), 350); }
  if (what === 'data') { if (!store.cfg) disconnect(); render(); if (store.cfg) connect(); }
  if (what === 'status') { updateSync(); if (store.status === 'denied') disconnect(); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (store.pending) store.sync(); disconnect(); return; }
  if (ui.follow) ui.day = today();
  render(); store.sync(); connect();
});
addEventListener('online', () => { store.sync(); connect(); });
addEventListener('offline', () => { disconnect(); store.sync(); });
setInterval(() => {
  if (document.hidden || !store.cfg) return;
  store.sync();
  if (ws && ws.readyState === 1) { if (!gotPong) { try { ws.close(); } catch { /* schon zu */ } } else { gotPong = false; ws.send('ping'); } } else connect();
  if (ui.tab === 'cal' && !sheet) { if (ui.follow && ui.day !== today()) ui.day = today(); update(); }
}, 45000);

// Neue App-Version: wird im Hintergrund geladen und übernommen, sobald gerade nichts offen ist
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { const t = e.data && e.data.zweiplanTab; if (['cal', 'shop', 'todo'].includes(t) && $('#view')) { closeSheet(true); setTab(t); } });
if ('serviceWorker' in navigator && (!LOCAL || new URLSearchParams(location.search).has('sw'))) {
  const had = !!navigator.serviceWorker.controller;
  let fresh = false;
  const apply = () => { if (fresh && !sheet && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) location.reload(); };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) { fresh = true; apply(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { apply(); navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {}); } });
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

render();
introOnce();
if (store.cfg) { store.sync(); connect(); Push.refresh(store); planSoon(); }
window.zweiplan = { store, ui };   // für die Klicktests
