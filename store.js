// Einträge auf dem Gerät und ihr Abgleich mit dem Dienst.
// Alles liegt lokal (die App läuft auch ohne Netz); Änderungen werden vorgemerkt und nachgereicht.
// Der Speicher (storage) und das Netz (fetchFn) werden hereingegeben – so läuft dasselbe in den Tests.
import { uid, deriveKeys } from './model.js';

const KEY = 'zweiplan-v1';
const CHUNK = 400;   // Änderungen je Anfrage (der Dienst nimmt höchstens 500)

export function createStore({ storage, fetchFn, api, now = () => Date.now() }) {
  let saved = {};
  try { saved = JSON.parse(storage.getItem(KEY) || '{}') || {}; } catch { saved = {}; }
  let cfg = saved.cfg || null;                       // { code, spaceId, key, seq }
  let me = saved.me || null;                         // 'p1' | 'p2'
  const dev = saved.dev || uid();                    // Kennung dieses Geräts (für Mitteilungen: „nicht an mich selbst“)
  let clock = saved.clock || 0;                      // höchster bisher gesehener Änderungszeitpunkt
  const items = new Map((saved.items || []).map(i => [i.id, i]));
  const dirty = new Set(saved.dirty || []);          // noch nicht beim Dienst angekommen
  const listeners = new Set();
  let status = 'idle';                               // idle | busy | ok | offline | denied | error
  let lastOk = saved.lastOk || 0;
  let running = null, again = false;

  const save = () => storage.setItem(KEY, JSON.stringify({ cfg, me, dev, clock, lastOk, items: [...items.values()], dirty: [...dirty] }));
  const emit = (what, detail) => { for (const f of [...listeners]) f(what, detail); };
  const setStatus = s => { if (s !== status) { status = s; emit('status'); } };
  // Änderungszeitpunkt: Geräteuhr, aber nie älter als etwas schon Gesehenes – so gewinnt die spätere Änderung
  const tick = () => (clock = Math.max(now(), clock + 1));
  const call = (path, body) => fetchFn(`${api}/s/${cfg.spaceId}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify(body || {}),
  });

  async function once() {
    const ids = [...dirty].slice(0, CHUNK);
    const sent = new Map(ids.map(id => [id, items.get(id).u]));
    let res, data;
    try {
      res = await call('sync', { since: cfg.seq || 0, from: dev, changes: ids.map(id => items.get(id)) });
    } catch { setStatus('offline'); return false; }
    if (!cfg) return false;                                      // währenddessen abgemeldet
    if (res.status === 403 || res.status === 404) { setStatus('denied'); return false; }
    if (!res.ok) { setStatus('error'); return false; }
    try { data = await res.json(); } catch { setStatus('error'); return false; }

    if (data.reset) {                                            // Dienst hat alles verloren: alles noch einmal schicken
      for (const id of items.keys()) dirty.add(id);
      cfg.seq = 0;
      save();
      again = true;
      return true;
    }
    // „voll“: der Dienst hat Neues nicht mehr angenommen – dann bleibt alles vorgemerkt
    if (!data.voll) for (const id of ids) {
      const it = items.get(id);
      if (it && it.u === sent.get(id)) { dirty.delete(id); if (it.x) items.delete(id); }
    }
    const seen = new Set();
    const remote = [];                                           // was von außen neu hereinkam (für Hinweise)
    const first = !cfg.seq;
    let changed = false;
    for (const it of data.items || []) {
      seen.add(it.id);
      if (it.u > clock) clock = it.u;
      if (dirty.has(it.id)) continue;                            // hier inzwischen weiter bearbeitet: geht gleich hoch
      const old = items.get(it.id);
      if (it.x) { if (old) { items.delete(it.id); changed = true; } continue; }
      if (!old || old.u !== it.u || JSON.stringify(old) !== JSON.stringify(it)) { items.set(it.id, it); changed = true; if (!sent.has(it.id)) remote.push({ old: old || null, it }); }
    }
    if (data.full) for (const id of [...items.keys()]) if (!dirty.has(id) && !seen.has(id)) { items.delete(id); changed = true; }
    cfg.seq = data.seq;
    lastOk = now();
    save();
    if (dirty.size && !data.voll) again = true;
    if (changed) emit('data');
    if (remote.length && !first && !data.full) emit('remote', remote);
    return true;
  }

  function sync() {
    if (!cfg) return Promise.resolve(false);
    if (running) { again = true; return running; }
    setStatus('busy');
    running = (async () => {
      let ok;
      do { again = false; ok = await once(); } while (ok && again);
      if (ok) setStatus('ok');
      return ok;
    })().finally(() => { running = null; });
    return running;
  }

  async function open(code, create) {
    const keys = await deriveKeys(code);
    cfg = { code, ...keys, seq: 0 };
    try {
      if (create) {
        const res = await call('create');
        if (!res.ok) { cfg = null; return res.status === 409 ? 'taken' : 'error'; }
      }
      const res = await call('sync', { since: 0, changes: [] });
      if (!res.ok) { cfg = null; return res.status === 404 || res.status === 403 ? 'unknown' : 'error'; }
    } catch { cfg = null; return 'offline'; }
    items.clear(); dirty.clear(); me = null;
    save();
    await sync();
    return 'ok';
  }

  return {
    get cfg() { return cfg; },
    get me() { return me; },
    get status() { return status; },
    get pending() { return dirty.size; },
    get lastOk() { return lastOk; },
    get dev() { return dev; },
    // Sonstige Anfrage an den Dienst (Mitteilungen an-/abmelden, Erinnerungsplan); liefert true bei Erfolg
    async post(path, body) { if (!cfg) return false; try { return (await call(path, body)).ok; } catch { return false; } },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    setMe(p) { me = p; save(); emit('data'); },
    all: t => [...items.values()].filter(i => i.t === t && !i.x),
    everything: () => [...items.values()].filter(i => !i.x),
    get: id => { const i = items.get(id); return i && !i.x ? i : null; },
    // Anlegen (ohne id) oder Ändern (mit id): nur die übergebenen Felder werden überschrieben
    put(fields) {
      const old = fields.id ? items.get(fields.id) : null;
      const it = { ...(old && !old.x ? old : { c: now() }), ...fields, id: fields.id || uid(), u: tick(), m: me || '' };
      delete it.x;
      items.set(it.id, it);
      dirty.add(it.id);
      save();
      emit('data'); emit('local');
      return it;
    },
    remove(id) {
      const old = items.get(id);
      if (!old) return;
      items.set(id, { id, t: old.t, u: tick(), x: 1, m: me || '' });
      dirty.add(id);
      save();
      emit('data'); emit('local');
    },
    create: code => open(code, true),
    join: code => open(code, false),
    leave() { cfg = null; me = null; clock = 0; lastOk = 0; items.clear(); dirty.clear(); storage.removeItem(KEY); status = 'idle'; emit('data'); },
    sync,
  };
}
