// Adresse des Abgleich-Dienstes. Beim Entwickeln auf dem eigenen Rechner der lokale Dienst (npm run dienst).
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
export const API = local ? `http://${location.hostname}:8787` : 'https://zweiplan-sync.zyklus-app-de.workers.dev';
export const LOCAL = local;
// Öffentlicher Schlüssel für Mitteilungen (der private liegt nur beim Dienst)
export const VAPID_PUBLIC = 'BJMUlqJ-qRZrf02I9uP4CZBwuyZ9GbfQRuwKlpSImyj8G6pSm1FDMjKqLHBnRh8Vef4rHlF7PUKdF7VtNU1B1Hk';
