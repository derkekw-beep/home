// Alle längeren Texte der App an einem Ort: Farbthemen, Einführung, Vorstellungen einzelner Funktionen
// und „Was ist neu“. Bei jeder neuen Funktion hier nachziehen.

export const LOOKS = [['indigo', 'Indigo', '#5046e5'], ['rose', 'Rosé', '#e64980'], ['wald', 'Wald', '#2b8a3e'], ['ozean', 'Ozean', '#1c7ed6'], ['sonne', 'Sonne', '#e8590c'], ['mokka', 'Mokka', '#8a5a3c'], ['nacht', 'Tinte', '#343a52']];

// Bei neuen Funktionen nachziehen: hier steht nur, was man unbedingt wissen sollte (fünf Karten, je zwei bis drei Sätze).
export const INTRO = [
  ['🗓️', 'Euer gemeinsamer Kalender', 'Tippe auf das Plus und schreib einfach los: „Kino Freitag 20 Uhr“ – Datum und Uhrzeit erkennt die App von selbst. Einen Termin zur Seite wischen löscht oder verschiebt ihn. Oben schaltest du zwischen Tag und Woche um.'],
  ['🛒', 'Eine Einkaufsliste für beide', 'Schreib auf, was fehlt – gern mehrere Sachen auf einmal: „Milch, Brot, Eier“. Im Laden hilft der Einkaufsmodus mit großen Zeilen. Unter „Rezepte“ genügt ein Name wie „Lasagne“ oder ein Link – die Zutaten kommen von selbst. Unter „Plan“ steht, was es diese Woche gibt.'],
  ['✅', 'To-dos mit Datum und Person', '„Müll rausbringen morgen“ genügt. Aufgaben lassen sich zuweisen, bekommen Unterpunkte und können sich zwischen euch abwechseln. Der Wochenrückblick zeigt, wer was geschafft hat.'],
  ['💌', 'Die Heute-Karte', 'Ganz oben steht, was als Nächstes kommt und wie viele Tage es noch bis zum Urlaub sind. Dort kannst du auch einen kleinen Zettel für den anderen hinlegen. Zu groß? Der Pfeil klappt sie ein.'],
  ['🔔', 'Nichts verpassen', 'Mit Mitteilungen erfährst du, wenn der andere etwas einträgt, und wirst an Termine erinnert. Das, die Farben, den Kalender-Export und die Sicherung findest du oben rechts in den Einstellungen.'],
];

export const TOURS = {
  rezepte: [
    ['🍝', 'Rezepte, die sich selbst ausfüllen', 'Tippe bei „Neues Rezept“ einfach einen Namen wie „Lasagne“. Die App schlägt das Gericht vor und trägt die Zutaten ein – anpassen kannst du danach alles.'],
    ['🔗', 'Oder ein erprobtes Rezept aus dem Netz', '„Auf Chefkoch suchen“ öffnet die bewerteten Rezepte zu deinem Namen. Link kopieren, „Link einfügen“ – Name, Portionen und Zutaten kommen von dort.'],
    ['🛒', 'Mit einem Tipp auf die Einkaufsliste', '„＋ auf die Liste“ fragt, für wie viele ihr kocht, rechnet die Mengen um und setzt nur drauf, was noch fehlt.'],
    ['📅', 'Essensplan für die Woche', 'Unter „Plan“ wählt ihr für jeden Tag ein Gericht oder lasst die Woche füllen. Ein Tipp setzt alle Zutaten gesammelt auf die Liste.'],
    ['🔗', 'Viele auf einmal, teilen', '„Links importieren“ holt mehrere Rezepte in einem Rutsch. Einzelne Rezepte lassen sich teilen, alle zusammen als Text ausgeben.'],
  ],
};

// Neueste Version zuerst. Bei jedem Update mit sichtbaren Änderungen oben einen Eintrag ergänzen.
export const NEWS = [
  ['1.9', '10. November 2026', [
    ['🎂', 'Geburtstagsliste', 'Im Kalender neben „Tag“ und „Woche“: alle Geburtstage, der nächste zuerst, mit Alter und „in 12 Tagen“. Schnell eintragen über das Plus; erinnert wird drei Tage vorher und am Tag selbst.'],
  ]],
  ['1.8', '10. November 2026', [
    ['👆', 'Termine zur Seite wischen', 'Nach links wischen: Löschen. Nach rechts wischen: um einen Tag oder eine Woche verschieben. Beides lässt sich kurz rückgängig machen.'],
    ['🔔', 'Mitteilungen einstellbar', 'In den Einstellungen wählt ihr, ob ihr bei Terminen, Einkäufen oder Aufgaben Bescheid bekommt.'],
  ]],
  ['1.7', '10. November 2026', [
    ['🏪', 'Regale wie in eurem Laden', 'Unter der Einkaufsliste: „Regale sortieren“. Die Liste folgt dann eurem Weg durch den Laden.'],
    ['⏩', 'Verschieben mit einem Tipp', 'Im Termin: „Auf morgen“, „+1 Tag“, „+1 Woche“. Bei überfälligen Aufgaben: alle auf heute oder morgen.'],
    ['📷', 'Rezepte mit Bild und Zubereitung', 'Beim Holen von einer Rezeptseite kommen jetzt auch das Bild und die Zubereitung mit. Eigene Notizen gehen genauso.'],
  ]],
  ['1.6', '10. November 2026', [
    ['📅', 'Essensplan', 'Unter Einkauf → Plan: für jeden Tag ein Gericht. „Woche füllen“ macht Vorschläge, ein Tipp setzt alle Zutaten der Woche gesammelt auf die Liste.'],
    ['🔗', 'Mehrere Rezept-Links auf einmal', 'Links untereinander einfügen – die App holt alle Rezepte nacheinander.'],
    ['🧁', 'Backen', 'Das Rezeptbuch kennt jetzt über 460 Gerichte, darunter rund 100 Kuchen, Plätzchen und Brote – von Zimtschnecken bis Zimtkuchen.'],
  ]],
  ['1.5', '10. November 2026', [
    ['🍝', 'Rezepte füllen sich selbst', 'Tippe „Lasagne“ – die Zutaten stehen da (rund 380 Gerichte, vom Avocado-Toast bis zum Bibimbap). Oder such ein bewertetes Rezept auf Chefkoch und lass die Zutaten vom Link holen.'],
    ['👥', 'Für wie viele?', 'Beim Draufsetzen auf die Einkaufsliste rechnet die App die Mengen auf eure Personenzahl um.'],
    ['🍽️', 'Einplanen und teilen', 'Ein Rezept direkt als Termin für den Abend eintragen, einzeln teilen oder alle als Text ausgeben.'],
    ['🔁', 'Wiederholungen tippen', '„Yoga jeden Donnerstag 18 Uhr“ oder „Müll jede Woche“ – die Wiederholung wird erkannt.'],
    ['🧠', 'Denkt mit', 'Die Einkaufsliste schlägt vor, was nach eurem Rhythmus bald wieder fehlt. Vor Geburtstagen erinnert die Heute-Karte ans Geschenk.'],
  ]],
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
