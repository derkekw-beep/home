// Mitteilungen auf diesem Gerät ein- und ausschalten. Der Dienst verschickt sie (worker/src/push.js),
// der Service Worker zeigt sie an (sw.js). Auf dem iPhone geht das nur in der App vom Home-Bildschirm.
import { VAPID_PUBLIC } from './config.js';

const FLAG = 'zweiplan-push';
const bytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

export const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export function isOn() {
  try { return supported() && localStorage.getItem(FLAG) === '1' && Notification.permission === 'granted'; } catch { return false; }
}
async function subscription() {
  await navigator.serviceWorker.register('./sw.js');
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(VAPID_PUBLIC) });
}
// Worüber dieses Gerät nicht benachrichtigt werden will (aus den Einstellungen)
const muted = () => { try { const m = JSON.parse(localStorage.getItem('zweiplan-prefs') || '{}').mute; return Array.isArray(m) ? m : []; } catch { return []; } };
function announce(store, sub, extra = {}) {
  const j = sub.toJSON();
  return store.post('push', { d: store.dev, me: store.me, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, mute: muted(), ...extra });
}

// Liefert 'ok' | 'unsupported' | 'denied' | 'offline' | 'error'. Muss direkt aus einem Tippen heraus aufgerufen werden.
export async function enable(store, test = false) {
  if (!supported()) return 'unsupported';
  try {
    if ((await Notification.requestPermission()) !== 'granted') return 'denied';
    if (!(await announce(store, await subscription(), test ? { test: true } : {}))) return 'offline';
    localStorage.setItem(FLAG, '1');
    return 'ok';
  } catch { return 'error'; }
}
export async function disable(store) {
  try { localStorage.removeItem(FLAG); } catch { /* egal */ }
  try {
    await store.post('push', { d: store.dev, off: true });
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch { /* dann bleibt es beim Abmelden am Dienst */ }
}
// Beim Start: Die Push-Adresse kann sich ändern – dem Dienst die aktuelle nennen
export async function refresh(store) {
  if (!isOn() || !store.cfg || !store.me) return;
  try { await announce(store, await subscription()); } catch { /* beim nächsten Start wieder */ }
}
