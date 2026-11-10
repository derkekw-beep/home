// Allgemeine Bausteine der Oberfläche: Elemente bauen, Symbole, Hinweise, Wischen, Auswahl-Leisten,
// der kleine Begleiter. Nichts hier kennt die Einträge des Planers.
import * as M from './model.js';

// ---- kleine Helfer ----------------------------------------------------------------------------
export const $ = (sel, el = document) => el.querySelector(sel);
export const today = () => M.ymd(new Date());
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const fmtDay = (s, opts) => M.toDate(s).toLocaleDateString('de-DE', opts);

export function h(tag, attrs, ...kids) {
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

export const ICON = {
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
export function icon(name, cls = '') {
  const s = h('span', { class: `ic ${cls}`, 'aria-hidden': 'true' });
  s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;
  return s;
}

// Bewegung: eine Klasse kurz setzen, damit die zugehörige CSS-Animation (neu) abläuft
export function play(el, cls) {
  if (!el) return;
  el.classList.remove('in-up', 'in-left', 'in-right', 'in-pop');
  void el.offsetWidth;
  el.classList.add(cls);
}
// Welche Zeilen gab es beim letzten Zeichnen schon? Neue (und gerade abgehakte) gleiten herein.
export const known = { set: new Set(), next: new Set(), ready: false };
export const knownDone = () => { known.set = known.next; known.next = new Set(); known.ready = true; };

// Der kleine Begleiter oben in der Leiste: schaut sich um, blinzelt, freut sich mit – und zeigt
// nebenbei, ob der Abgleich klappt (traurig = offline).
export function buddy() {
  const b = h('button', { class: 'buddy', id: 'buddy', type: 'button', 'aria-label': 'Hallo!', onclick: () => cheer('wink') });
  b.innerHTML = '<svg viewBox="0 0 44 44" width="42" height="42" aria-hidden="true"><g class="b-all">'
    + '<g class="b-sprout"><path d="M22 9 C22 6 22 5 22 3.5" /><path class="b-leaf" d="M22 4.5 C19 1 15.5 2 15 4.8 C18 6.6 20.5 6 22 4.5 Z"/><path class="b-leaf" d="M22 4.5 C25 1 28.5 2 29 4.8 C26 6.6 23.5 6 22 4.5 Z"/></g>'
    + '<g class="b-body"><path class="b-face" d="M22 8 C33 8 39.5 15 39.5 25 C39.5 34.5 32.5 40 22 40 C11.5 40 4.5 34.5 4.5 25 C4.5 15 11 8 22 8 Z"/>'
    + '<ellipse class="b-shine" cx="14" cy="14.5" rx="4.2" ry="2.2" transform="rotate(-28 14 14.5)"/>'
    + '<g class="b-look"><ellipse class="b-cheek" cx="10.8" cy="28.5" rx="3.3" ry="2.2"/><ellipse class="b-cheek" cx="33.2" cy="28.5" rx="3.3" ry="2.2"/>'
    + '<g class="b-eyes"><g class="b-eye b-l"><circle cx="15" cy="24" r="3.6"/><circle class="b-glint" cx="13.7" cy="22.5" r="1.35"/><circle class="b-glint" cx="16.3" cy="25.4" r=".6"/></g>'
    + '<g class="b-eye b-r"><circle cx="29" cy="24" r="3.6"/><circle class="b-glint" cx="27.7" cy="22.5" r="1.35"/><circle class="b-glint" cx="30.3" cy="25.4" r=".6"/></g></g>'
    + '<g class="b-joy"><path d="M11.6 24.8 Q15 20.4 18.4 24.8"/><path d="M25.6 24.8 Q29 20.4 32.4 24.8"/></g>'
    + '<path class="b-mouth" d="M19.2 28.6 Q20.6 31 22 28.8 Q23.4 31 24.8 28.6"/><path class="b-frown" d="M19.5 31 Q22 28.6 24.5 31"/><path class="b-smile" d="M15.5 28.5 Q22 34.5 28.5 28.5"/></g></g>'
    + '<path class="b-heart" d="M37 9.5 c-1.6 -2.6 -5 -.6 -3.4 2 c.8 1.3 2.2 2.2 3.4 3.3 c1.2 -1.1 2.6 -2 3.4 -3.3 c1.6 -2.6 -1.8 -4.6 -3.4 -2 Z"/></g></svg>';
  return b;
}
export let cheerTimer;
export function cheer(cls = 'happy') {
  const b = $('#buddy');
  if (!b) return;
  b.classList.remove('happy', 'wink');
  void b.offsetWidth;
  b.classList.add(cls);
  clearTimeout(cheerTimer);
  cheerTimer = setTimeout(() => b.classList.remove('happy', 'wink'), 1300);
}

export async function giveFile(name, text, type) {
  try {
    const file = new File([text], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

export let toastTimer;
export function toast(text) {
  let t = $('#toast');
  if (!t) document.body.append(t = h('div', { id: 'toast', role: 'status' }));
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

// Wischen nach links/rechts. Sobald die Bewegung erkennbar waagerecht ist, gehört sie dem Wischen
// (die Seite scrollt dann nicht mehr mit) – sonst bricht das Handy die Geste mitten drin ab.
export function swipe(el, onLeft, onRight) {
  let x0 = null, y0 = 0, dx = 0, dy = 0, lock = '', t0 = 0;
  el.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || e.target.closest('input, textarea, select, .suggest')) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = dy = 0; lock = ''; t0 = Date.now();
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (x0 === null) return;
    dx = e.touches[0].clientX - x0; dy = e.touches[0].clientY - y0;
    if (!lock && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) lock = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
    if (lock === 'x' && e.cancelable) e.preventDefault();
  }, { passive: false });
  const end = () => {
    if (x0 === null) return;
    x0 = null;
    if (lock === 'x' && Math.abs(dx) > (Date.now() - t0 < 300 ? 28 : 48)) (dx < 0 ? onLeft : onRight)();   // kurzes schnelles Wischen zählt auch
  };
  el.addEventListener('touchend', end, { passive: true });
  el.addEventListener('touchcancel', end, { passive: true });
}

// Knopf, der erst beim zweiten Tippen auslöst („Löschen“ -> „Wirklich löschen?“)
export function confirmBtn(label, sure, fn, cls = 'btn danger') {
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
export function seg(options, value, onChange, cls = 'seg') {
  const el = h('div', { class: cls, role: 'group' });
  const draw = () => el.replaceChildren(...options.map(([v, label, style]) =>
    h('button', { type: 'button', class: v === value ? 'on' : '', style, 'aria-pressed': String(v === value), onclick: () => { value = v; draw(); onChange(v); } }, label)));
  draw();
  el.set = v => { value = v; draw(); };
  return el;
}
export const field = (label, ...control) => h('div', { class: 'field' }, h('div', { class: 'field-label' }, label), ...control);

