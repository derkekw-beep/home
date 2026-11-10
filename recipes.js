// Rezepte: ein kleines eingebautes Rezeptbuch (Name tippen – Zutaten sind da), Mengen auf die
// Personenzahl umrechnen, Rezepte als Text ausgeben. Reine Funktionen, in test/recipes.test.js geprüft.

// [Name, Portionen, Zutaten] – übliche Mengen für die angegebene Portionenzahl
export const BOOK = [
  ['Spaghetti Bolognese', 4, '500 g Spaghetti|500 g Hackfleisch|1 Zwiebel|2 Knoblauchzehen|2 Karotten|800 g gehackte Tomaten|2 EL Tomatenmark|Parmesan'],
  ['Spaghetti Carbonara', 4, '500 g Spaghetti|200 g Speck|4 Eier|100 g Parmesan|Pfeffer'],
  ['Lasagne', 4, '12 Lasagneplatten|500 g Hackfleisch|1 Zwiebel|800 g gehackte Tomaten|2 EL Tomatenmark|50 g Butter|50 g Mehl|500 ml Milch|200 g geriebener Käse'],
  ['Nudelauflauf', 4, '400 g Nudeln|200 g Kochschinken|200 ml Sahne|3 Eier|200 g geriebener Käse|1 Zwiebel'],
  ['Pesto-Nudeln', 2, '250 g Nudeln|1 Glas Pesto|Parmesan|Cherrytomaten'],
  ['Käsespätzle', 4, '800 g Spätzle|300 g Bergkäse|3 Zwiebeln|50 g Butter|Schnittlauch'],
  ['Chili con Carne', 4, '500 g Hackfleisch|2 Dosen Kidneybohnen|1 Dose Mais|800 g gehackte Tomaten|2 Zwiebeln|2 Knoblauchzehen|2 Paprika|Chilipulver|Reis'],
  ['Chili sin Carne', 4, '2 Dosen Kidneybohnen|1 Dose Mais|800 g gehackte Tomaten|2 Zwiebeln|2 Paprika|200 g rote Linsen|Chilipulver|Reis'],
  ['Hähnchen-Curry', 4, '500 g Hähnchenbrust|400 ml Kokosmilch|2 EL Currypaste|1 Paprika|1 Zwiebel|300 g Reis|Ingwer'],
  ['Gemüse-Curry', 4, '400 ml Kokosmilch|2 EL Currypaste|1 Brokkoli|2 Karotten|1 Paprika|1 Dose Kichererbsen|300 g Reis'],
  ['Gebratener Reis', 2, '250 g Reis|2 Eier|1 Paprika|2 Karotten|100 g Erbsen|Sojasauce|2 Frühlingszwiebeln'],
  ['Risotto mit Pilzen', 4, '350 g Risottoreis|400 g Champignons|1 Zwiebel|1 l Gemüsebrühe|100 ml Weißwein|80 g Parmesan|30 g Butter'],
  ['Pizza', 4, '500 g Mehl|1 Würfel Hefe|400 g passierte Tomaten|300 g Mozzarella|Oregano|Olivenöl|Belag nach Wunsch'],
  ['Flammkuchen', 2, '1 Flammkuchenteig|200 g Schmand|150 g Speckwürfel|2 Zwiebeln'],
  ['Burger', 4, '4 Burgerbrötchen|500 g Hackfleisch|4 Scheiben Cheddar|1 Tomate|Salat|1 Zwiebel|Gewürzgurken|Ketchup'],
  ['Wraps', 4, '8 Tortillas|400 g Hähnchenbrust|1 Paprika|1 Dose Mais|Salat|200 g Schmand|150 g geriebener Käse'],
  ['Tacos', 4, '12 Taco-Schalen|500 g Hackfleisch|1 Dose Kidneybohnen|Salat|2 Tomaten|150 g geriebener Käse|Salsa|Schmand'],
  ['Schnitzel mit Pommes', 4, '4 Schnitzel|2 Eier|Mehl|Paniermehl|750 g Pommes|1 Zitrone'],
  ['Frikadellen', 4, '500 g Hackfleisch|1 Brötchen|1 Ei|1 Zwiebel|Senf|Kartoffeln'],
  ['Gulasch', 4, '800 g Rindergulasch|4 Zwiebeln|2 Paprika|2 EL Tomatenmark|500 ml Rinderbrühe|Paprikapulver|Nudeln'],
  ['Hähnchen aus dem Ofen', 4, '4 Hähnchenschenkel|800 g Kartoffeln|2 Paprika|1 Zucchini|Olivenöl|Paprikapulver'],
  ['Lachs mit Ofengemüse', 2, '2 Lachsfilets|400 g Kartoffeln|1 Zucchini|1 Paprika|1 Zitrone|Olivenöl'],
  ['Fischstäbchen mit Kartoffelbrei', 2, '10 Fischstäbchen|600 g Kartoffeln|100 ml Milch|30 g Butter|300 g Spinat'],
  ['Kartoffelsuppe', 4, '1 kg Kartoffeln|2 Karotten|1 Stange Lauch|1 Zwiebel|1 l Gemüsebrühe|200 ml Sahne|4 Wiener Würstchen'],
  ['Kürbissuppe', 4, '1 Hokkaido-Kürbis|2 Karotten|1 Zwiebel|750 ml Gemüsebrühe|200 ml Kokosmilch|Ingwer'],
  ['Tomatensuppe', 4, '800 g gehackte Tomaten|1 Zwiebel|2 Knoblauchzehen|500 ml Gemüsebrühe|100 ml Sahne|Basilikum|Baguette'],
  ['Linsensuppe', 4, '300 g Linsen|2 Karotten|2 Kartoffeln|1 Zwiebel|1 l Gemüsebrühe|4 Wiener Würstchen|Essig'],
  ['Kartoffelpuffer', 4, '1 kg Kartoffeln|1 Zwiebel|2 Eier|3 EL Mehl|Öl|Apfelmus'],
  ['Bratkartoffeln mit Spiegelei', 2, '600 g Kartoffeln|1 Zwiebel|100 g Speckwürfel|4 Eier'],
  ['Kartoffelgratin', 4, '1 kg Kartoffeln|400 ml Sahne|2 Knoblauchzehen|150 g geriebener Käse|Muskat'],
  ['Ofengemüse mit Feta', 2, '2 Paprika|1 Zucchini|1 Aubergine|300 g Kartoffeln|200 g Feta|Olivenöl'],
  ['Gemüsepfanne', 2, '1 Brokkoli|2 Karotten|1 Paprika|1 Zucchini|Sojasauce|200 g Reis'],
  ['Shakshuka', 2, '800 g gehackte Tomaten|4 Eier|1 Paprika|1 Zwiebel|2 Knoblauchzehen|Kreuzkümmel|Fladenbrot'],
  ['Griechischer Salat', 2, '1 Gurke|3 Tomaten|1 Paprika|200 g Feta|1 rote Zwiebel|Oliven|Olivenöl'],
  ['Caesar Salad', 2, '2 Romanasalat|300 g Hähnchenbrust|Parmesan|Croûtons|Caesar-Dressing'],
  ['Nudelsalat', 6, '500 g Nudeln|200 g Fleischwurst|1 Glas Gewürzgurken|1 Dose Mais|1 Paprika|Mayonnaise|200 g Joghurt'],
  ['Kartoffelsalat', 6, '1,5 kg Kartoffeln|1 Zwiebel|250 ml Gemüsebrühe|Essig|Öl|Senf|Gewürzgurken'],
  ['Pfannkuchen', 4, '250 g Mehl|500 ml Milch|3 Eier|Butter|Zucker|Apfelmus'],
  ['Waffeln', 4, '250 g Mehl|125 g Butter|100 g Zucker|3 Eier|250 ml Milch|1 Päckchen Backpulver|Vanillezucker'],
  ['Rührei mit Brot', 2, '5 Eier|30 g Butter|Schnittlauch|Brot'],
  ['Raclette', 4, '800 g Raclettekäse|1 kg Kartoffeln|1 Glas Gewürzgurken|1 Dose Mais|200 g Speck|Champignons|Baguette'],
  ['Grillen', 4, '4 Steaks|8 Bratwürste|Grillkäse|Baguette|Kräuterbutter|Salat|Ketchup|Senf'],
  ['Sonntagsfrühstück', 2, '4 Brötchen|4 Eier|Butter|Marmelade|Käse|Aufschnitt|Orangensaft|Kaffee'],
  ['Kuchen (Rührteig)', 12, '250 g Butter|200 g Zucker|4 Eier|400 g Mehl|1 Päckchen Backpulver|125 ml Milch|Vanillezucker'],
  ['Bananenbrot', 10, '3 reife Bananen|250 g Mehl|100 g Zucker|2 Eier|80 g Butter|1 Päckchen Backpulver|Walnüsse'],
];

const norm = s => String(s || '').toLowerCase().replace(/[^a-zäöüß0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// Passende Gerichte zum getippten Namen (alle Wörter müssen vorkommen; ab drei Buchstaben)
export function findDish(query, max = 4) {
  const words = norm(query).split(' ').filter(Boolean);
  if (norm(query).length < 3) return [];
  return BOOK.filter(([name]) => words.every(w => norm(name).includes(w)))
    .sort((a, b) => (norm(a[0]).startsWith(words[0]) ? 0 : 1) - (norm(b[0]).startsWith(words[0]) ? 0 : 1) || a[0].length - b[0].length)
    .slice(0, max).map(([title, serves, items]) => ({ title, serves, items: items.split('|').join('\n') }));
}

// ---- Mengen umrechnen -------------------------------------------------------------------------
const nice = n => {
  const r = n >= 100 ? Math.round(n / 5) * 5 : n >= 10 ? Math.round(n) : Math.round(n * 4) / 4;     // 437 g -> 435 g, 2,3 -> 2,25
  const whole = Math.floor(r), frac = r - whole;
  const f = { 0.25: '¼', 0.5: '½', 0.75: '¾' }[frac];
  return f ? (whole ? `${whole} ${f}` : f) : String(r).replace('.', ',');
};
// „500 g Hackfleisch“ × 1,5 -> „750 g Hackfleisch“; Zeilen ohne Menge bleiben, wie sie sind
export function scaleLine(line, factor) {
  if (!factor || factor === 1) return line;
  const m = /^\s*(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|[¼½¾])(?=\s|[a-zA-Zäöü]|$)(.*)$/.exec(line);
  if (!m) return line;
  const raw = m[1].replace(/\s/g, '');
  const n = raw.includes('/') ? Number(raw.split('/')[0]) / Number(raw.split('/')[1]) : { '¼': 0.25, '½': 0.5, '¾': 0.75 }[raw] ?? Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return line;
  const out = n * factor;
  // Stückzahlen (ohne Einheit dahinter) nicht in Viertel zerlegen: 1 Zwiebel × 1,5 -> 2 Zwiebeln wäre geraten – lieber aufrunden auf halbe
  const unit = /^\s*(g|kg|ml|l|el|tl|prise|msp)\b/i.test(m[2]);
  return `${unit ? nice(out) : nice(Math.max(0.5, Math.round(out * 2) / 2))}${m[2]}`;
}
export const lines = text => String(text || '').split('\n').map(x => x.trim()).filter(Boolean);
export function scaleItems(text, from, to) {
  const f = from > 0 && to > 0 ? to / from : 1;
  return lines(text).map(l => scaleLine(l, f));
}

// ---- Ausgeben ---------------------------------------------------------------------------------
export function recipeText(r) {
  return `${r.title}${r.serves ? ` (für ${r.serves})` : ''}\n${lines(r.items).map(l => `• ${l}`).join('\n')}${r.link ? `\n${r.link}` : ''}`;
}
export const recipesText = list => `${[...list].sort((a, b) => a.title.localeCompare(b.title, 'de')).map(recipeText).join('\n\n')}\n`;
