// Oberfläche des Planers: Kalender (Zeitstrahl + Monat), Einkaufsliste, To-dos, Einstellungen, Einrichtung.
import * as M from './model.js';
import * as S from './smart.js';
import * as X from './extra.js';
import { createStore } from './store.js';
import { API, LOCAL } from './config.js';
import * as Push from './push.js';

const store = createStore({ storage: localStorage, fetchFn: (u, i) => fetch(u, i), api: API });
const root = document.getElementById('app');
const ui = { tab: 'cal', day: M.ymd(new Date()), month: false, filter: '', follow: true };
{ const t = new URLSearchParams(location.search).get('tab'); if (['cal', 'shop', 'todo'].includes(t)) ui.tab = t; }

// ---- Aussehen (je Gerät): Hell/Dunkel und Farbthema --------------------------------------------
const LOOKS = [['indigo', 'Indigo', '#5046e5'], ['rose', 'Rosé', '#e64980'], ['wald', 'Wald', '#2b8a3e'], ['ozean', 'Ozean', '#1c7ed6'], ['sonne', 'Sonne', '#e8590c'], ['mokka', 'Mokka', '#8a5a3c'], ['nacht', 'Tinte', '#343a52']];
const prefs = { theme: 'auto', look: 'indigo', buddy: 'cute', start: 'cal', card: 'open', mode: 'day' };   // buddy: 'cute' (süß) | 'plain' (schlicht) | 'off'
try { Object.assign(prefs, JSON.parse(localStorage.getItem('zweiplan-prefs') || '{}')); } catch { /* Standard */ }
function applyPrefs(saveIt) {
  const el = document.documentElement;
  if (prefs.theme === 'auto') delete el.dataset.theme; else el.dataset.theme = prefs.theme;
  el.dataset.look = LOOKS.some(l => l[0] === prefs.look) ? prefs.look : 'indigo';
  el.dataset.buddy = ['cute', 'plain', 'off'].includes(prefs.buddy) ? prefs.buddy : 'cute';
  const bg = getComputedStyle(el).getPropertyValue('--bg-flat').trim();     // Farbe der Statusleiste mitziehen
  if (bg) for (const m of document.querySelectorAll('meta[name=theme-color]')) { m.removeAttribute('media'); m.content = bg; }
  if (saveIt) try { localStorage.setItem('zweiplan-prefs', JSON.stringify(prefs)); } catch { /* egal */ }
}
applyPrefs(false);
if (!new URLSearchParams(location.search).get('tab') && ['cal', 'shop', 'todo'].includes(prefs.start)) ui.tab = prefs.start;
ui.mode = prefs.mode === 'week' ? 'week' : 'day';
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyPrefs(false));

// ---- Zoom-Sperre: die App verhält sich wie eine App, nicht wie eine Webseite (immer an) ---------
// iOS beachtet „user-scalable=no“ allein nicht: Zwei-Finger-Zoom und Doppeltipp-Zoom hier abfangen.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());
// Doppeltipp-Zoom verhindert „touch-action“ im Stylesheet – ohne dass schnelles Tippen auf zwei Knöpfe verloren geht.

// Tastatur des Handys: Fenster von unten enden über der Tastatur statt dahinter
if (window.visualViewport) {
  const kb = () => document.documentElement.style.setProperty('--kb', `${Math.max(0, Math.round(innerHeight - visualViewport.height - visualViewport.offsetTop))}px`);
  visualViewport.addEventListener('resize', kb);
  visualViewport.addEventListener('scroll', kb);
}

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
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
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

// Der kleine Begleiter oben in der Leiste: schaut sich um, blinzelt, freut sich mit – und zeigt
// nebenbei, ob der Abgleich klappt (traurig = offline).
function buddy() {
  const b = h('button', { class: 'buddy', id: 'buddy', type: 'button', 'aria-label': 'Hallo!', onclick: () => cheer('wink') });
  b.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true">'
    + '<g class="b-sprout"><path d="M22 9 C22 6 22 5 22 3.5" /><path class="b-leaf" d="M22 4.5 C19 1 15.5 2 15 4.8 C18 6.6 20.5 6 22 4.5 Z"/><path class="b-leaf" d="M22 4.5 C25 1 28.5 2 29 4.8 C26 6.6 23.5 6 22 4.5 Z"/></g>'
    + '<g class="b-body"><path class="b-face" d="M22 8 C33 8 39.5 15 39.5 25 C39.5 34.5 32.5 40 22 40 C11.5 40 4.5 34.5 4.5 25 C4.5 15 11 8 22 8 Z"/>'
    + '<ellipse class="b-shine" cx="14" cy="14.5" rx="4.2" ry="2.2" transform="rotate(-28 14 14.5)"/>'
    + '<g class="b-look"><ellipse class="b-cheek" cx="10.8" cy="28.5" rx="3.3" ry="2.2"/><ellipse class="b-cheek" cx="33.2" cy="28.5" rx="3.3" ry="2.2"/>'
    + '<g class="b-eyes"><g class="b-eye b-l"><circle cx="15" cy="24" r="3.6"/><circle class="b-glint" cx="13.7" cy="22.5" r="1.35"/><circle class="b-glint" cx="16.3" cy="25.4" r=".6"/></g>'
    + '<g class="b-eye b-r"><circle cx="29" cy="24" r="3.6"/><circle class="b-glint" cx="27.7" cy="22.5" r="1.35"/><circle class="b-glint" cx="30.3" cy="25.4" r=".6"/></g></g>'
    + '<g class="b-joy"><path d="M11.6 24.8 Q15 20.4 18.4 24.8"/><path d="M25.6 24.8 Q29 20.4 32.4 24.8"/></g>'
    + '<path class="b-mouth" d="M19.2 28.6 Q20.6 31 22 28.8 Q23.4 31 24.8 28.6"/><path class="b-frown" d="M19.5 31 Q22 28.6 24.5 31"/><path class="b-smile" d="M15.5 28.5 Q22 34.5 28.5 28.5"/></g></g>'
    + '<path class="b-heart" d="M37 9.5 c-1.6 -2.6 -5 -.6 -3.4 2 c.8 1.3 2.2 2.2 3.4 3.3 c1.2 -1.1 2.6 -2 3.4 -3.3 c1.6 -2.6 -1.8 -4.6 -3.4 -2 Z"/></svg>';
  return b;
}
let cheerTimer;
function cheer(cls = 'happy') {
  const b = $('#buddy');
  if (!b) return;
  b.classList.remove('happy', 'wink');
  void b.offsetWidth;
  b.classList.add(cls);
  clearTimeout(cheerTimer);
  cheerTimer = setTimeout(() => b.classList.remove('happy', 'wink'), 1300);
}

async function giveFile(name, text, type) {
  try {
    const file = new File([text], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

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
      buddy(),
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
  if (id !== 'shop' && ui.store) { ui.store = false; if (wake) { wake.release().catch(() => {}); wake = null; } }
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
      h('span', {}, fmtDay(ui.day, ui.day.slice(0, 4) === t.slice(0, 4) ? { month: 'long' } : { month: 'short', year: 'numeric' })), icon('down', ui.month ? 'flip' : '')));
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
  b.hidden = cls === 'ok' || cls === 'busy';             // solange alles gut ist, zeigt das der Begleiter
  const face = $('#buddy');
  if (face) { face.classList.toggle('sad', cls === 'off' || cls === 'bad'); face.classList.toggle('busy', cls === 'busy'); }
}

// ---- Kalender ---------------------------------------------------------------------------------
const WD_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function goDay(d, closeMonth) {
  const dir = d > ui.day ? 'in-left' : d < ui.day ? 'in-right' : '';
  const wasWeek = M.mondayOf(ui.day), wasMonth = ui.day.slice(0, 7), hadMonth = ui.month;
  ui.day = d; ui.follow = d === today(); ui.showPast = false;
  if (closeMonth) ui.month = false;
  update();
  if (dir) play($('#calDay'), dir);
  if (hadMonth !== ui.month) play($('#calHead .days'), 'in-pop');
  else if (dir && (ui.month ? wasMonth !== d.slice(0, 7) : wasWeek !== M.mondayOf(d))) play($('#calHead .days'), dir);
}
function moveDay(n) { goDay(M.addDays(ui.day, n)); }
function setMode(m) { ui.mode = m; prefs.mode = m; applyPrefs(true); update(); play($('#calDay'), 'in-up'); }
function moveMonth(n) { goDay(M.addMonths(ui.day, n)); }

views.cal = {
  mount(v) {
    v.append(h('div', { id: 'calHead' }), h('div', { id: 'calDay' }));
    swipe($('#calHead'), () => (ui.month ? moveMonth(1) : moveDay(7)), () => (ui.month ? moveMonth(-1) : moveDay(-7)));
    swipe($('#calDay'), () => moveDay(ui.mode === 'week' ? 7 : 1), () => moveDay(ui.mode === 'week' ? -7 : -1));
  },
  update() {
    const t = today(), events = store.all('event'), todos = store.all('todo').filter(x => !x.done && x.due);
    const [y, m] = ui.day.split('-').map(Number);
    const days = ui.month ? M.monthGrid(y, m) : M.weekOf(ui.day);
    const dayBtn = d => {
      const evs = M.eventsOn(events, d);
      const span = evs.find(e => e.allDay && e.days > 1);          // mehrtägig: durchgehender Balken
      const dots = evs.filter(e => e !== span).slice(0, 3).map(e => h('i', { class: 'dot', style: whoVars(e.who) }));
      if (todos.some(x => x.due === d)) dots.push(h('i', { class: 'dot hollow' }));
      const out = ui.month && Number(d.slice(5, 7)) !== m;
      return h('button', { type: 'button', class: `d${d === ui.day ? ' sel' : ''}${d === t ? ' today' : ''}${out ? ' out' : ''}${X.isFree(d) ? ' hol' : ''}`, 'data-day': d,
        'aria-label': fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long' }) + (evs.length ? `, ${evs.length} Termine` : ''),
        onclick: () => goDay(d, true) },
        h('span', { class: 'n' }, String(Number(d.slice(8)))), h('span', { class: 'dots' }, dots.slice(0, 4)),
        span ? h('i', { class: `bar${X.spanText(span, d).startsWith('Tag 1 ') ? ' first' : ''}${M.occursOn(span, M.addDays(d, 1)) ? '' : ' last'}`, style: whoVars(span.who) }) : null);
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
    const week = M.weekOf(ui.day), hol = X.holidayOn(ui.day);
    const tools = h('div', { class: 'day-tools' },
      seg([['day', 'Tag'], ['week', 'Woche']], ui.mode, setMode, 'mini'),
      h('button', { type: 'button', class: 'icon-btn small', id: 'searchBtn', 'aria-label': 'Suchen', onclick: openSearch }, icon('search')));
    if (ui.mode === 'week') {
      $('#calDay').replaceChildren(
        h('div', { class: 'day-title' }, h('b', {}, `KW ${X.isoWeek(ui.day)}`), h('span', { class: 'grow' }, `${Number(week[0].slice(8))}.${week[0].slice(5, 7) === week[6].slice(5, 7) ? '' : ` ${fmtDay(week[0], { month: 'short' })}`} – ${fmtDay(week[6], { day: 'numeric', month: 'long' })}`), tools),
        agenda(week, events, todos, t));
      return;
    }
    const kids = [h('div', { class: 'day-title' }, rel ? h('b', {}, rel) : null,
      h('span', { class: 'grow' }, fmtDay(ui.day, { weekday: rel ? 'short' : 'long', day: 'numeric', month: 'long' }), hol ? h('em', { class: 'hol-name' }, ` · ${hol}`) : null), tools)];
    if (ui.day === t) kids.push(todayCard(events));

    if (allDay.length || due.length) {
      kids.push(h('div', { class: 'allday' },
        allDay.map(e => h('button', { type: 'button', class: 'chip-ev', style: whoVars(e.who), 'data-id': e.id, onclick: () => openEvent(e.id) },
          h('span', { class: 'emo' }, e.icon || '📌'), h('span', { class: 'grow' }, X.evTitle(e, ui.day)), X.spanText(e, ui.day) ? h('span', { class: 'tag' }, X.spanText(e, ui.day)) : null, e.rep ? icon('repeat', 'small') : null)),
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
      const gone = ui.day === t ? timed.filter(e => (e.start || 0) + (e.dur || 0) <= now).length : 0;
      const fold = gone >= 2 && !ui.showPast;                    // heute schon Vorbeigegangenes zusammenfalten
      if (fold) tl.append(h('button', { type: 'button', class: 'fold', id: 'foldBtn', onclick: () => { ui.showPast = true; update(); } }, `✓ ${gone} Termine sind schon vorbei · anzeigen`));
      for (const r of M.dayPlan(timed)) {
        if (fold && (r.kind === 'gap' ? r.to <= now : r.end <= now)) continue;
        if (r.kind === 'gap') {
          if (!nowShown && now >= r.from && now < r.to) tl.append(line());
          tl.append(h('button', { type: 'button', class: 'gap', 'aria-label': `Freie Zeit ab ${M.fmtTime(r.from)}: Termin eintragen`, onclick: () => openEvent(null, { start: r.from, dur: Math.min(60, r.min) }) }, h('span', {}, `＋ ${M.fmtDur(r.min)} frei`)));
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
            h('span', { class: 'ev-title' }, X.evTitle(e, ui.day), e.rep ? icon('repeat', 'small') : null),
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
  const small = prefs.card === 'small';
  const fold = h('button', { type: 'button', class: 'card-fold', id: 'cardFold', 'aria-label': small ? 'Karte aufklappen' : 'Karte einklappen', 'aria-expanded': String(!small), onclick: () => { prefs.card = small ? 'open' : 'small'; applyPrefs(true); update(); } }, icon('down', small ? '' : 'flip'));
  if (small) return h('section', { class: 'today-card small', style: whoVars('both') }, fold,
    h('div', { class: 'next' }, next
      ? [h('span', { class: 'emo' }, next.ev.icon || '📌'), h('span', {}, h('b', {}, next.ev.title), next.live ? ` läuft noch ${M.fmtDur(next.min)}` : ` ${S.inText(next.min)}`)]
      : 'Heute steht nichts mehr im Kalender.'),
    theirs && theirs.text ? h('div', { class: 'zettel' }, h('span', { class: 'emo' }, '💌'), h('span', {}, h('b', {}, `${ot.name}: `), theirs.text)) : null);
  return h('section', { class: 'today-card', style: whoVars('both') }, fold,
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

// Wochenübersicht: sieben Tage untereinander, jeder Termin eine Zeile
function agenda(week, events, todos, t) {
  return h('div', { class: 'agenda' }, week.map(d => {
    const evs = M.eventsOn(events, d), due = todos.filter(x => x.due === d), hol = X.holidayOn(d);
    return h('section', { class: `ag-day${d === t ? ' today' : ''}${d < t ? ' past' : ''}`, 'data-day': d },
      h('button', { type: 'button', class: 'ag-head', 'aria-label': `${fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long' })} öffnen`, onclick: () => { ui.mode = 'day'; prefs.mode = 'day'; applyPrefs(true); goDay(d, true); if (d === ui.day) update(); } },
        h('span', { class: `ag-wd${X.isFree(d) ? ' hol' : ''}` }, fmtDay(d, { weekday: 'short' }).replace('.', '')), h('b', {}, String(Number(d.slice(8)))),
        d === t ? h('span', { class: 'tag now-tag' }, 'Heute') : null, hol ? h('span', { class: 'hol-name' }, hol) : null),
      h('div', { class: 'ag-list' },
        evs.map(e => h('button', { type: 'button', class: 'ag-row', style: whoVars(e.who), 'data-id': e.id, onclick: () => openEvent(e.id) },
          h('span', { class: 'ag-time' }, e.allDay ? (X.spanText(e, d).replace(' von ', '/') || 'ganztägig') : M.fmtTime(e.start || 0)), h('i', { class: 'dot' }),
          h('span', { class: 'ag-title' }, `${e.icon || '📌'} ${X.evTitle(e, d)}`))),
        due.map(x => h('button', { type: 'button', class: 'ag-row todo', 'data-id': x.id, onclick: () => openTodo(x.id) },
          h('span', { class: 'ag-time' }, 'To-do'), h('i', { class: 'dot hollow' }), h('span', { class: 'ag-title' }, x.title))),
        !evs.length && !due.length ? h('button', { type: 'button', class: 'ag-free', 'aria-label': 'Termin eintragen', onclick: () => openEvent(null, { date: d, start: 9 * 60 }) }, 'frei · ＋') : null));
  }));
}

// Suche über alles: Termine, Aufgaben, Einkäufe, Vorrat, Rezepte
function openSearch() {
  const out = h('div', { class: 'card results', id: 'searchOut' });
  const LABEL = { todo: 'To-do', shop: 'Einkaufsliste', stock: 'Vorrat', recipe: 'Rezept' };
  const go = hit => {
    closeSheet(true);
    if (hit.kind === 'event') { ui.mode = 'day'; if (ui.tab !== 'cal') setTab('cal'); goDay(hit.day, true); update(); play($(`[data-id="${hit.it.id}"]`), 'in-pop'); }
    else if (hit.kind === 'todo') { setTab('todo'); openTodo(hit.it.id); }
    else { ui.shop = hit.kind === 'shop' ? 'list' : hit.kind; setTab('shop'); }
  };
  const draw = () => {
    const hits = X.search(store.everything(), input.value, today());
    out.hidden = input.value.trim().length < 2;
    out.replaceChildren(...(hits.length ? hits.map(hit => h('button', { type: 'button', class: 'row result', onclick: () => go(hit) },
      h('span', { class: 'emo' }, hit.kind === 'event' ? hit.it.icon || '📌' : { todo: '✅', shop: '🛒', stock: '🫙', recipe: '📖' }[hit.kind]),
      h('span', { class: 'row-main' }, h('span', { class: 'row-title' }, hit.kind === 'event' ? X.evTitle(hit.it, hit.day) : hit.it.title),
        h('span', { class: 'row-meta' }, h('span', { class: 'note-mark' }, hit.kind === 'event'
          ? `${fmtDay(hit.day, { weekday: 'short', day: 'numeric', month: 'short', year: hit.day.slice(0, 4) === today().slice(0, 4) ? undefined : 'numeric' })}${hit.it.allDay ? '' : ` · ${M.fmtTime(hit.it.start || 0)}`}${hit.day < today() ? ' · vorbei' : ''}`
          : `${LABEL[hit.kind]}${hit.it.done ? ' · erledigt' : hit.day ? ` · ${M.dueLabel(hit.day, today()).text}` : ''}`)))))
      : [h('p', { class: 'hint pad-all' }, 'Nichts gefunden.')]));
  };
  const input = h('input', { type: 'text', class: 'title-in', id: 'searchIn', placeholder: 'Termin, Aufgabe, Einkauf …', maxLength: 60, enterKeyHint: 'search', autocomplete: 'off', 'aria-label': 'Suchen', oninput: draw });
  out.hidden = true;
  openSheet('Suchen', h('div', { class: 'title-row' }, input), out);
  setTimeout(() => input.focus(), 60);
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
        if (quick.start !== undefined && !touched.time) { f.start = quick.start; if (f.allDay) { f.allDay = false; allDayBox.checked = false; times.hidden = false; spanBox.hidden = true; } }
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
  const date = h('input', { type: 'date', value: f.date, 'aria-label': 'Datum', onchange: () => { touched.date = true; if (date.value) f.date = date.value; else date.value = f.date; checkClash(); } });
  const durLabel = h('span', { class: 'dur-label' });
  const start = h('input', { type: 'time', value: M.fmtTime(f.start), 'aria-label': 'Beginn', onchange: () => { touched.time = true; const v = M.parseTime(start.value); if (v !== null) f.start = v; sync(); } });
  const end = h('input', { type: 'time', value: M.fmtTime(f.start + f.dur), 'aria-label': 'Ende', onchange: () => {
    touched.time = true;
    const v = M.parseTime(end.value);
    if (v !== null) f.dur = v > f.start ? v - f.start : v + 1440 - f.start;
    sync();
  } });
  const durs = seg([[15, '15 Min.'], [30, '30 Min.'], [45, '45 Min.'], [60, '1 Std.'], [90, '1,5 Std.'], [120, '2 Std.'], [180, '3 Std.']], f.dur, v => { touched.time = true; f.dur = v; sync(); }, 'chips');
  // Überschneidung mit einem anderen Termin derselben Person? Dann warnen und die nächste freie Zeit anbieten.
  const clash = h('div', { class: 'clash', hidden: true });
  function checkClash() {
    const draft = { id: old ? old.id : '', date: f.date, start: f.start, dur: f.dur, who: f.who, allDay: f.allDay };
    const hits = X.conflicts(store.all('event'), draft);
    clash.hidden = !hits.length;
    if (!hits.length) return;
    const free = X.freeSlot(store.all('event'), draft);
    clash.replaceChildren(h('span', { class: 'grow' }, `⚠️ Überschneidet sich mit „${hits[0].title}“ (${M.fmtTime(hits[0].start || 0)} – ${M.fmtTime((hits[0].start || 0) + (hits[0].dur || 0))})`),
      free !== null ? h('button', { type: 'button', class: 'link', id: 'freeBtn', onclick: () => { touched.time = true; f.start = free; sync(); } }, `Frei: ${M.fmtTime(free)}`) : null);
  }
  function sync() {
    checkClash();
    start.value = M.fmtTime(f.start); end.value = M.fmtTime(f.start + f.dur);
    durLabel.textContent = `Dauer: ${M.fmtDur(f.dur)}${f.start + f.dur > 1440 ? ' (bis zum nächsten Tag)' : ''}`;
    durs.set(f.dur);
  }
  const times = h('div', { class: 'times', hidden: f.allDay },
    h('div', { class: 'two' }, field('Beginn', start), field('Ende', end)), durs, durLabel, clash, field('Erinnern', rem));
  sync();
  const endDate = h('input', { type: 'date', value: f.days > 1 ? M.addDays(f.date, f.days - 1) : '', 'aria-label': 'Bis', onchange: () => { f.end = endDate.value || ''; } });
  f.end = endDate.value;
  const spanBox = h('div', { hidden: !f.allDay }, field('Bis (bei mehreren Tagen, z. B. Urlaub)', endDate));
  const birth = h('input', { type: 'text', inputMode: 'numeric', maxLength: 4, placeholder: 'z. B. 1956', value: f.birth ? String(f.birth) : '', 'aria-label': 'Geburtsjahr' });
  const birthBox = h('div', { hidden: f.rep !== 'y' }, field('Geburtstag? Geburtsjahr (dann steht das Alter dabei)', birth));
  const allDayBox = h('input', { type: 'checkbox', checked: !!f.allDay, onchange: () => { f.allDay = allDayBox.checked; times.hidden = f.allDay; spanBox.hidden = !f.allDay; checkClash(); } });
  const allDay = h('label', { class: 'switch' }, allDayBox, h('span', {}, 'Ganztägig'));
  const pin = h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: !!f.pin, onchange: e => { f.pin = e.target.checked; } }), h('span', {}, 'Countdown auf der Heute-Karte'));
  const rep = h('select', { 'aria-label': 'Wiederholen', onchange: () => { f.rep = rep.value; birthBox.hidden = f.rep !== 'y'; } }, M.REPEATS.map(([v, l]) => h('option', { value: v, selected: v === (f.rep || '') }, l)));
  const note = h('textarea', { rows: 2, placeholder: 'Notiz (optional)', maxLength: 600, value: f.note || '', oninput: () => { f.note = note.value; } });

  const save = () => {
    const t = (old ? f.title : quick.title || '').trim();
    if (!t) { title.classList.add('err'); title.focus(); return; }
    const fields = { ...(old ? { id: old.id } : { by: store.me }), t: 'event', title: t, icon: f.icon, date: f.date, allDay: !!f.allDay, start: f.start, dur: f.dur, who: f.who, rep: f.rep || '', until: f.until || '', pin: !!f.pin, rem: f.rem,
      days: f.allDay && f.end && f.end > f.date ? Math.min(60, M.dayDiff(f.date, f.end) + 1) : 1, birth: f.rep === 'y' && /^(19|20)\d\d$/.test(birth.value.trim()) ? Number(birth.value.trim()) : 0, note: (f.note || '').trim() };
    const it = store.put(Object.assign(fields));
    ui.day = f.date; ui.follow = f.date === today();
    closeSheet(); update();
    play($(`.ev[data-id="${it.id}"], .chip-ev[data-id="${it.id}"]`), 'in-pop');
  };
  openSheet(old ? 'Termin bearbeiten' : 'Neuer Termin',
    h('div', { class: 'title-row' }, iconBtn, title), magic, grid,
    field('Für wen?', seg(whoOptions(), f.who, v => { f.who = v; checkClash(); })),
    h('div', { class: 'two' }, field('Datum', date), field('Wiederholen', rep)),
    allDay, spanBox, times, birthBox, pin, note,
    h('div', { class: 'actions' },
      old ? confirmBtn('Löschen', old.rep ? 'Ganze Serie löschen?' : 'Wirklich löschen?', () => { store.remove(old.id); closeSheet(); }) : null,
      h('button', { type: 'button', class: 'btn primary', id: 'saveBtn', onclick: save }, old ? 'Speichern' : 'Eintragen')));
  if (!old) setTimeout(() => title.focus(), 60);
}

// ---- gemeinsame Zeilen für Einkauf und To-dos -------------------------------------------------
function toggleDone(it) {
  if (it.t === 'todo' && !it.done && it.rep) {       // wiederkehrende Aufgabe: springt auf den nächsten Termin
    const due = S.nextDue(it.due, it.rep, today());
    const turn = it.rot && (it.who === 'p1' || it.who === 'p2');       // im Wechsel: jetzt ist der andere dran
    store.put({ id: it.id, due, hist: [...(it.hist || []), [Date.now(), store.me]].slice(-30), subs: (it.subs || []).map(x => ({ t: x.t, d: 0 })), ...(turn ? { who: M.other(it.who) } : {}) });
    if (turn) { cheer(); return toast(`Erledigt 🎉 Nächstes Mal: ${person(M.other(it.who)).name}`); }
    cheer();
    return toast(`Erledigt 🎉 Wieder fällig: ${M.dueLabel(due, today()).text}`);
  }
  if (!it.done) cheer();
  store.put({ id: it.id, done: !it.done, doneAt: it.done ? 0 : Date.now(), ...(it.t === 'todo' ? { doneBy: it.done ? '' : store.me } : {}), ...(it.t === 'shop' && !it.done ? { n: (it.n || 0) + 1 } : {}) });
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
let wake = null;
async function storeMode(on) {          // Einkaufsmodus: große Zeilen, nur was fehlt, Bildschirm bleibt an
  ui.store = on;
  try { if (on && navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); else if (wake) { await wake.release(); wake = null; } } catch { /* dann eben ohne */ }
  if (ui.tab === 'shop') setTab('shop');
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && ui.store) storeMode(true); });
const onList = title => store.all('shop').some(i => !i.done && i.title.toLowerCase() === title.toLowerCase());

views.shop = {
  mount(v) {
    shopTyped = '';
    if (!['list', 'stock', 'recipe'].includes(ui.shop)) ui.shop = 'list';
    if (ui.store) { v.append(h('div', { id: 'shopList', class: 'store' })); return; }
    v.append(h('div', { id: 'shopTabs' }, seg([['list', 'Liste'], ['stock', 'Vorrat'], ['recipe', 'Rezepte']], ui.shop, x => { ui.shop = x; setTab('shop'); })));
    if (ui.shop === 'list') {
      // mehrere auf einmal: „Milch, Brot, Eier“
      v.append(quickAdd('Was fehlt? z. B. Milch, Brot', text => { for (const part of text.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean)) addShop(part.slice(0, 120)); },
        typed => { shopTyped = typed; views.shop.suggest(); }), h('div', { id: 'shopSuggest', class: 'suggest' }), h('div', { id: 'shopList' }));
    } else if (ui.shop === 'stock') {
      v.append(quickAdd('Was habt ihr immer da? z. B. Kaffee', text => { for (const part of text.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean)) if (!store.all('stock').some(i => i.title.toLowerCase() === part.toLowerCase())) store.put({ t: 'stock', title: part.slice(0, 120), by: store.me }); }),
        h('div', { id: 'stockList' }));
    } else {
      v.append(h('button', { type: 'button', class: 'btn soft wide', id: 'recipeNew', onclick: () => openRecipe() }, '＋ Neues Rezept'), h('div', { id: 'recipeList' }));
    }
  },
  suggest() {
    if (!$('#shopSuggest')) return;
    const list = S.suggestShop(store.all('shop'), shopTyped.split(/[,;]/).pop());
    $('#shopSuggest').replaceChildren(...(list.length ? [h('span', { class: 'suggest-label' }, shopTyped ? 'Meinst du' : 'Oft gekauft'),
      ...list.map(i => h('button', { type: 'button', onclick: () => { addShop(i.title); const inp = $('.quick input'); if (shopTyped && inp) { inp.value = ''; shopTyped = ''; } } }, `＋ ${i.title}`))] : []));
  },
  update() {
    if (ui.store) return views.shop.updateStore();
    if (ui.shop === 'stock') return views.shop.updateStock();
    if (ui.shop === 'recipe') return views.shop.updateRecipes();
    const all = store.all('shop');
    const open = all.filter(i => !i.done);
    const done = all.filter(i => i.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 40);
    const mk = i => { const q = S.splitQty(i.title); return row(i, { title: q.name, lead: q.qty, meta: i.by && i.by !== store.me && !i.done ? [whoTag(i.by)] : null, onOpen: () => openShop(i.id) }); };
    const kids = [];
    views.shop.suggest();
    if (open.length) {
      kids.push(h('button', { type: 'button', class: 'btn soft wide store-btn', id: 'storeBtn', onclick: () => storeMode(true) }, '🛍️ Im Laden? Einkaufsmodus'));
      for (const g of S.groupShop(open)) kids.push(h('div', { class: 'sec aisle' }, h('span', {}, `${g.emoji} ${g.label}`)), h('div', { class: 'card' }, g.items.map(mk)));
    } else kids.push(h('div', { class: 'empty' }, h('div', { class: 'empty-emo' }, '🛒'), h('p', {}, done.length ? 'Alles eingekauft!' : 'Die Liste ist leer. Schreib oben auf, was fehlt.')));
    if (done.length) kids.push(...section(`Erledigt (${done.length})`,
      confirmBtn('Aufräumen', 'Alle entfernen?', () => { for (const i of done) store.remove(i.id); toast('Erledigte entfernt'); }, 'link'), done.map(mk)));
    $('#shopList').replaceChildren(...kids);
    knownDone();
  },
  updateStore() {
    const all = store.all('shop'), open = all.filter(i => !i.done);
    const total = open.length + all.filter(i => i.done && Date.now() - (i.doneAt || 0) < 3 * 3600000).length, got = total - open.length;
    const mk = i => { const q = S.splitQty(i.title); return row(i, { title: q.name, lead: q.qty, onOpen: () => toggleDone(i) }); };
    const kids = [h('div', { class: 'store-head' }, h('div', {}, h('b', {}, open.length ? `Noch ${open.length}` : 'Alles im Wagen 🎉'), h('span', { class: 'hint' }, total ? ` · ${got} von ${total} erledigt` : '')),
      h('button', { type: 'button', class: 'pill', id: 'storeEnd', onclick: () => storeMode(false) }, 'Fertig')),
      h('div', { class: 'progress' }, h('i', { style: `width:${total ? Math.round(100 * got / total) : 100}%` }))];
    for (const g of S.groupShop(open)) kids.push(h('div', { class: 'sec aisle' }, h('span', {}, `${g.emoji} ${g.label}`)), h('div', { class: 'card' }, g.items.map(mk)));
    $('#shopList').replaceChildren(...kids);
    knownDone();
  },
  updateStock() {
    const list = store.all('stock').sort((a, b) => a.title.localeCompare(b.title, 'de'));
    $('#stockList').replaceChildren(...(list.length ? [h('p', { class: 'hint pad' }, 'Geht etwas zur Neige? Ein Tipp setzt es auf die Einkaufsliste.'), h('div', { class: 'card' }, list.map(i => { const there = onList(i.title);
      return h('div', { class: 'row', 'data-id': i.id }, h('button', { type: 'button', class: 'row-main pad-l', onclick: () => openShop(i.id) }, h('span', { class: 'row-title' }, i.title)),
        h('button', { type: 'button', class: `pill small${there ? ' there' : ''}`, disabled: there, onclick: () => { addShop(i.title); toast(`„${i.title}“ steht auf der Liste`); cheer(); } }, there ? '✓ steht drauf' : 'Bald leer')); }))]
      : [h('div', { class: 'empty' }, h('div', { class: 'empty-emo' }, '🫙'), h('p', {}, 'Hier steht, was ihr immer im Haus habt: Kaffee, Klopapier, Olivenöl … Wird etwas knapp, genügt ein Tipp.'))]));
  },
  updateRecipes() {
    const list = store.all('recipe').sort((a, b) => a.title.localeCompare(b.title, 'de'));
    const lines = r => String(r.items || '').split('\n').map(x => x.trim()).filter(Boolean);
    $('#recipeList').replaceChildren(...(list.length ? [h('div', { class: 'card' }, list.map(r => h('div', { class: 'row', 'data-id': r.id },
      h('button', { type: 'button', class: 'row-main pad-l', onclick: () => openRecipe(r.id) }, h('span', { class: 'row-title' }, `📖 ${r.title}`), h('span', { class: 'row-meta' }, h('span', { class: 'note-mark' }, `${lines(r).length} Zutaten`))),
      h('button', { type: 'button', class: 'pill small', onclick: () => cook(r) }, '＋ auf die Liste'))))]
      : [h('div', { class: 'empty' }, h('div', { class: 'empty-emo' }, '🍝'), h('p', {}, 'Lieblingsgerichte mit ihren Zutaten: Ein Tipp setzt alles auf die Einkaufsliste.'))]));
  },
};
function cook(r) {
  const lines = String(r.items || '').split('\n').map(x => x.trim()).filter(Boolean);
  let n = 0;
  for (const l of lines) if (!onList(l)) { const same = store.all('shop').find(i => i.title.toLowerCase() === l.toLowerCase()); if (same) store.put({ id: same.id, done: false, doneAt: 0, by: store.me, c: Date.now() }); else store.put({ t: 'shop', title: l.slice(0, 120), done: false, by: store.me }); n++; }
  toast(n ? `${n} ${n === 1 ? 'Zutat' : 'Zutaten'} für „${r.title}“ auf der Liste` : 'Steht alles schon drauf');
  if (n) cheer();
}
function openRecipe(id) {
  const it = id ? store.get(id) : null;
  const title = h('input', { type: 'text', class: 'title-in', value: it ? it.title : '', placeholder: 'Name, z. B. Spaghetti Bolognese', maxLength: 80, 'aria-label': 'Name des Rezepts' });
  const items = h('textarea', { rows: 7, maxLength: 1500, placeholder: 'Zutaten, eine pro Zeile:\n500 g Hackfleisch\nSpaghetti\n2 Dosen Tomaten', value: it ? it.items || '' : '', 'aria-label': 'Zutaten' });
  const save = () => { const t = title.value.trim(); if (!t) { title.focus(); return null; } const r = store.put({ ...(it ? { id } : { by: store.me }), t: 'recipe', title: t, items: items.value.trim() }); closeSheet(); return r; };
  openSheet(it ? 'Rezept' : 'Neues Rezept', h('div', { class: 'title-row' }, title), items,
    h('button', { type: 'button', class: 'btn soft', id: 'recipeCook', onclick: () => { const r = save(); if (r) cook(r); } }, '🛒 Speichern und Zutaten auf die Liste'),
    h('div', { class: 'actions' }, it ? confirmBtn('Löschen', 'Wirklich löschen?', () => { store.remove(id); closeSheet(); }) : null, h('button', { type: 'button', class: 'btn primary', id: 'saveBtn', onclick: save }, 'Speichern')));
  if (!it) setTimeout(() => title.focus(), 60);
}

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
      h('div', { id: 'todoFilter' }), h('div', { id: 'todoList' }),
      h('button', { type: 'button', class: 'btn soft wide', id: 'reviewBtn', onclick: openReview }, '📊 Wochenrückblick'));
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
      if (x.subs && x.subs.length) meta.push(h('span', { class: 'note-mark' }, `☑ ${x.subs.filter(u => u.d).length}/${x.subs.length}`));
      if (x.rep) meta.push(h('span', { class: 'note-mark' }, (S.TODO_REPEATS.find(r => r[0] === x.rep) || ['', ''])[1] + (x.rot ? ' · im Wechsel' : '')));
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

function openReview() {
  const r = X.weekReview(store.everything(), Date.now());
  const card = p => { const who = person(p), list = r.by[p]; const count = new Map(); for (const t of list) count.set(t, (count.get(t) || 0) + 1);
    return h('div', { class: 'set-body review', style: `--c:${who.color}` }, h('div', { class: 'review-head' }, h('b', {}, who.name), h('span', { class: 'review-n' }, String(list.length))),
      list.length ? h('p', { class: 'hint' }, [...count].map(([t, n]) => (n > 1 ? `${t} ×${n}` : t)).join(' · ')) : h('p', { class: 'hint' }, 'Diese Woche noch nichts abgehakt.')); };
  openSheet('Wochenrückblick',
    h('p', { class: 'hint' }, r.total ? `In den letzten 7 Tagen habt ihr ${r.total} ${r.total === 1 ? 'Aufgabe' : 'Aufgaben'} erledigt, ${r.bought} ${r.bought === 1 ? 'Sache' : 'Sachen'} eingekauft und ${r.events} ${r.events === 1 ? 'Termin' : 'Termine'} gehabt. 🎉` : 'In den letzten 7 Tagen ist noch nichts abgehakt worden.'),
    card(store.me), card(M.other(store.me)),
    h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn primary', onclick: () => closeSheet() }, 'Schön!')));
}

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
    store.put({ id, title: tt, who: f.who || '', due: f.due || (f.rep ? today() : ''), rep: f.rep || '', rot: !!(f.rep && f.rot), subs: f.subs, note: (f.note || '').trim() });
    closeSheet();
  };
  // Unterpunkte
  f.subs = (it.subs || []).map(x => ({ t: x.t, d: x.d ? 1 : 0 }));
  const subList = h('div', { class: 'subs' });
  const drawSubs = () => subList.replaceChildren(...f.subs.map((x, i) => h('div', { class: `sub${x.d ? ' done' : ''}` },
    h('button', { type: 'button', class: `check${x.d ? ' on' : ''}`, 'aria-label': `${x.t} abhaken`, onclick: () => { x.d = x.d ? 0 : 1; drawSubs(); } }, x.d ? icon('check') : null),
    h('span', { class: 'grow' }, x.t),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': `${x.t} entfernen`, onclick: () => { f.subs.splice(i, 1); drawSubs(); } }, icon('x')))));
  drawSubs();
  const subIn = h('input', { type: 'text', placeholder: 'Unterpunkt hinzufügen …', maxLength: 80, enterKeyHint: 'done', 'aria-label': 'Unterpunkt hinzufügen',
    onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); const v = subIn.value.trim(); if (v && f.subs.length < 20) { f.subs.push({ t: v, d: 0 }); subIn.value = ''; drawSubs(); } } } });
  const rotBox = h('label', { class: 'switch', hidden: !f.rep }, h('input', { type: 'checkbox', checked: !!f.rot, onchange: e => { f.rot = e.target.checked; } }), h('span', {}, 'Im Wechsel: nach dem Abhaken ist der andere dran'));
  const rep = h('select', { 'aria-label': 'Wiederholen', onchange: () => { f.rep = rep.value; rotBox.hidden = !f.rep; } }, S.TODO_REPEATS.map(([v, l]) => h('option', { value: v, selected: v === (f.rep || '') }, l)));
  openSheet('Aufgabe', h('div', { class: 'title-row' }, title),
    field('Wer macht das?', seg([['', 'Egal'], ...whoOptions('Beide')], f.who || '', v => { f.who = v; })),
    field('Fällig', quick, h('div', { class: 'two' }, date, rep)), rotBox,
    field('Unterpunkte', subList, subIn), note,
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
    group('Aussehen', theme, looks,
      field('Beim Öffnen zeigen', seg([['cal', 'Kalender'], ['shop', 'Einkauf'], ['todo', 'To-dos']], prefs.start, v => { prefs.start = v; applyPrefs(true); })),
      field('Begleiter oben in der Leiste', seg([['cute', '🌱 Süß'], ['plain', '🙂 Schlicht'], ['off', 'Aus']], prefs.buddy, v => { prefs.buddy = v; applyPrefs(true); cheer('wink'); }))),
    group('Mitteilungen',
      h('label', { class: 'switch' }, pushBox, h('span', {}, 'Mitteilungen auf diesem Gerät')),
      can ? h('p', { class: 'hint' }, `Du bekommst Bescheid, wenn ${ot.named ? ot.name : 'der andere'} etwas einträgt, vor Terminen und morgens mit dem Tagesüberblick.`)
        : h('p', { class: 'hint box' }, 'Hier nicht möglich. Auf dem iPhone: in Safari auf „Teilen“ → „Zum Home-Bildschirm“, die App von dort öffnen und dann hier einschalten.'),
      h('div', { class: 'two' }, field('Tagesüberblick', sum), field('Vor Terminen', remSel))),
    group('Zu zweit', h('p', { class: 'hint' }, ot.named ? [h('i', { class: 'dot', style: `--c1:${ot.color};--c2:${ot.color}` }), ` ${ot.name} ist dabei.`] : 'Noch allein hier. Gib den Paar-Code weiter – auf dem zweiten Handy „Ich habe einen Paar-Code“ wählen.'), codeBox()),
    group('Abgleich', state, h('button', { type: 'button', class: 'btn soft', onclick: async () => { const ok = await store.sync(); toast(ok ? 'Abgeglichen' : 'Gerade keine Verbindung'); } }, 'Jetzt abgleichen')),
    group('Eure Daten',
      h('button', { type: 'button', class: 'btn soft', id: 'icsBtn', onclick: () => giveFile('home-kalender.ics', X.toICS(store.all('event')), 'text/calendar') }, '🗓️ Kalender exportieren (für Apple Kalender)'),
      h('button', { type: 'button', class: 'btn soft', id: 'backupBtn', onclick: () => giveFile(`home-sicherung-${today()}.json`, X.toBackup(store.everything(), Date.now()), 'application/json') }, '💾 Sicherung als Datei speichern'),
      h('label', { class: 'btn soft file' }, '📂 Sicherung einspielen', h('input', { type: 'file', accept: '.json,application/json', id: 'restoreIn', onchange: async e => {
        const f = e.target.files[0]; if (!f) return;
        const list = X.fromBackup(await f.text());
        if (!list) return toast('Das ist keine Sicherung dieser App');
        for (const it of list) store.put(it);
        toast(`${list.length} Einträge eingespielt`);
      } })),
      h('p', { class: 'hint' }, 'Einspielen ergänzt und überschreibt gleiche Einträge; gelöscht wird dabei nichts.')),
    group('Dieses Gerät',
      h('p', { class: 'hint' }, 'Aufs iPhone: in Safari auf „Teilen“ und „Zum Home-Bildschirm“. Die App vom Home-Bildschirm hat einen eigenen Speicher – dort den Paar-Code noch einmal eingeben.'),
      h('button', { type: 'button', class: 'btn soft', id: 'newsBtn', onclick: () => openNews(false) }, `Was ist neu? · Version ${NEWS[0][0]}`),
      h('button', { type: 'button', class: 'btn soft', id: 'introAgain', onclick: () => { closeSheet(true); openIntro(false); } }, 'Einführung noch einmal ansehen'),
      confirmBtn('Abmelden', 'Wirklich abmelden? Die Einträge bleiben beim Dienst.', async () => { closeSheet(true); await Push.disable(store); store.leave(); }, 'btn danger wide')));
}

// ---- Was ist neu (erscheint einmal nach einem Update, sonst unter Einstellungen) -----------------
// Neueste Version zuerst. Bei jedem Update mit sichtbaren Änderungen oben einen Eintrag ergänzen.
const NEWS = [
  ['1.4', '10. November 2026', [
    ['🗓️', 'Kalender aufgeräumt', 'Neue Wochenübersicht (Tag/Woche umschalten), die Heute-Karte lässt sich einklappen, Vergangenes von heute faltet sich zusammen. Dazu Feiertage und Kalenderwoche.'],
    ['⚠️', 'Überschneidungen', 'Beim Eintragen warnt die App, wenn schon etwas ansteht – und schlägt die nächste freie Zeit vor.'],
    ['🔍', 'Suche', 'Die Lupe im Kalender findet Termine, Aufgaben, Einkäufe und Rezepte.'],
    ['🎂', 'Geburtstage mit Alter', 'Jährlicher Termin plus Geburtsjahr – und im Kalender steht „wird 70“.'],
    ['🏖️', 'Mehrtägige Termine', 'Ganztägig mit „Bis“-Datum: Der Urlaub zieht sich als Balken durch die Woche.'],
    ['👆', 'Freie Zeit antippen', 'Im Zeitstrahl auf eine Lücke tippen und dort direkt einen Termin eintragen.'],
    ['🛍️', 'Einkaufsmodus', 'Im Laden: große Zeilen, nur was fehlt, der Bildschirm bleibt an.'],
    ['🫙', 'Vorrat und Rezepte', 'Was immer da sein soll, mit einem Tipp auf die Liste. Rezepte setzen alle Zutaten auf einmal drauf.'],
    ['☑️', 'Unterpunkte und Wechsel', 'Aufgaben mit Unterpunkten; Wiederkehrendes kann zwischen euch abwechseln.'],
    ['📊', 'Wochenrückblick', 'Unter den To-dos: wer was erledigt hat.'],
    ['💾', 'Export und Sicherung', 'Kalender für Apple Kalender ausgeben, alle Daten als Datei sichern – in den Einstellungen. Dort auch: womit die App startet.'],
  ]],
  ['1.3', '10. November 2026', [
    ['🩹', 'Schnelles Tippen kommt an', 'Zwei Einträge direkt nacheinander abhaken ging manchmal ins Leere – behoben.'],
    ['🔔', 'Mitteilungen verlässlicher', 'Sie kommen jetzt auch, wenn das Handy die App gerade erst in den Hintergrund gelegt hat.'],
    ['⌨️', 'Tastatur verdeckt nichts mehr', 'Beim Eintragen bleibt der Speichern-Knopf über der Tastatur sichtbar.'],
    ['📰', 'Was ist neu', 'Diese Übersicht erscheint nach jedem Update einmal – und steht in den Einstellungen.'],
  ]],
  ['1.2', '10. November 2026', [
    ['🌱', 'Ein kleiner Begleiter', 'Oben in der Leiste schaut er sich um, freut sich beim Abhaken und wird traurig ohne Netz. Süß, schlicht oder aus – in den Einstellungen.'],
    ['🏠', 'Neuer Name', 'Die App heißt jetzt „Home“.'],
  ]],
  ['1.1', '10. November 2026', [
    ['✨', 'Weichere Übergänge', 'Tage gleiten herein, Abgehaktes wird sichtbar durchgestrichen.'],
    ['👋', 'Kurze Einführung', 'Fünf Karten erklären das Wichtigste; jederzeit erneut in den Einstellungen.'],
    ['🔒', 'Kein versehentliches Zoomen', 'Die App bleibt, wie sie ist – auch bei zwei Fingern.'],
  ]],
];
const newsSeen = () => { try { return localStorage.getItem('zweiplan-neu') || ''; } catch { return NEWS[0][0]; } };
const markNews = () => { try { localStorage.setItem('zweiplan-neu', NEWS[0][0]); } catch { /* egal */ } };
function openNews(onlyNew) {
  const seen = newsSeen();
  const list = onlyNew ? NEWS.filter(n => n[0] > seen) : NEWS;
  markNews();
  openSheet('Was ist neu', list.map(([v, date, items]) => h('section', { class: 'set' }, h('h3', {}, `Version ${v} · ${date}`),
    h('div', { class: 'set-body news' }, items.map(([emo, title, text]) => h('div', { class: 'news-item' }, h('span', { class: 'emo' }, emo), h('div', {}, h('b', {}, title), h('p', {}, text))))))),
    h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn primary', id: 'newsOk', onclick: () => closeSheet() }, 'Alles klar')));
}
// Nach einem Update einmal zeigen – nicht bei der allerersten Einrichtung (da gibt es die Einführung)
function newsOnce() {
  if (!store.cfg || !store.me) return;
  if (!introSeen()) return markNews();
  if (newsSeen() < NEWS[0][0] && !document.querySelector('.intro')) openNews(true);
}

// ---- Einführung (einmal je Gerät, später unter Einstellungen) -----------------------------------
// Bei neuen Funktionen nachziehen: hier steht nur, was man unbedingt wissen sollte (fünf Karten, je zwei bis drei Sätze).
const INTRO = [
  ['🗓️', 'Euer gemeinsamer Kalender', 'Tippe auf das Plus und schreib einfach los: „Kino Freitag 20 Uhr“ – Datum und Uhrzeit erkennt die App von selbst. Oben schaltest du zwischen Tag und Woche um; die Lupe findet alles wieder.'],
  ['🛒', 'Eine Einkaufsliste für beide', 'Schreib auf, was fehlt – gern mehrere Sachen auf einmal: „Milch, Brot, Eier“. Im Laden hilft der Einkaufsmodus mit großen Zeilen. Unter „Vorrat“ und „Rezepte“ landet Wiederkehrendes mit einem Tipp auf der Liste.'],
  ['✅', 'To-dos mit Datum und Person', '„Müll rausbringen morgen“ genügt. Aufgaben lassen sich zuweisen, bekommen Unterpunkte und können sich zwischen euch abwechseln. Der Wochenrückblick zeigt, wer was geschafft hat.'],
  ['💌', 'Die Heute-Karte', 'Ganz oben steht, was als Nächstes kommt und wie viele Tage es noch bis zum Urlaub sind. Dort kannst du auch einen kleinen Zettel für den anderen hinlegen. Zu groß? Der Pfeil klappt sie ein.'],
  ['🔔', 'Nichts verpassen', 'Mit Mitteilungen erfährst du, wenn der andere etwas einträgt, und wirst an Termine erinnert. Das, die Farben, den Kalender-Export und die Sicherung findest du oben rechts in den Einstellungen.'],
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
      markNews();
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
  if (text) { toast(text); cheer(); }
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
  if (ui.tab === 'cal' && !sheet) { if (ui.follow && ui.day !== today()) ui.day = today(); update(); }
}, 45000);

// Alle 20 Sekunden „ich bin noch da“: hält die Verbindung wach, erkennt eine tote Verbindung – und der Dienst
// weiß, dass die App wirklich offen ist (nur dann spart er sich die Mitteilung über Änderungen).
setInterval(() => {
  if (document.hidden || !store.cfg) return;
  if (ws && ws.readyState === 1) { if (!gotPong) { try { ws.close(); } catch { /* schon zu */ } } else { gotPong = false; ws.send('ping'); } } else if (!ws) connect();
}, 20000);

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
newsOnce();
introOnce();
if (store.cfg) { store.sync(); connect(); Push.refresh(store); planSoon(); }
window.zweiplan = { store, ui };   // für die Klicktests
