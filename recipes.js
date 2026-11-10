// Rezepte: ein kleines eingebautes Rezeptbuch (Name tippen – Zutaten sind da), Mengen auf die
// Personenzahl umrechnen, Rezepte als Text ausgeben. Reine Funktionen, in test/recipes.test.js geprüft.

// [Name, Portionen, Zutaten] – übliche Mengen für die angegebene Portionenzahl. Selbst zusammengestellte
// Einkaufshilfe (keine geprüften Kochanleitungen); für erprobte Rezepte: Link einer Rezeptseite einlesen.
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
  ['Avocado-Toast', 2, '4 Scheiben Brot|2 Avocados|1 Zitrone|2 Eier|Chiliflocken|Salz'],
  ['Omelett', 1, '3 Eier|20 g Butter|50 g geriebener Käse|Schnittlauch|1 Tomate'],
  ['Porridge', 2, '100 g Haferflocken|400 ml Milch|1 Banane|Honig|Zimt|Beeren'],
  ['Overnight Oats', 2, '100 g Haferflocken|250 ml Milch|150 g Joghurt|1 EL Chiasamen|Honig|Beeren'],
  ['Müsli-Bowl', 2, '300 g Joghurt|100 g Müsli|1 Banane|150 g Beeren|Honig'],
  ['French Toast', 2, '4 Scheiben Toast|2 Eier|100 ml Milch|20 g Butter|Zimt|Zucker|Ahornsirup'],
  ['Strammer Max', 2, '4 Scheiben Brot|4 Scheiben Kochschinken|4 Eier|20 g Butter|Gewürzgurken'],
  ['Croque Monsieur', 2, '4 Scheiben Toast|4 Scheiben Kochschinken|100 g geriebener Käse|20 g Butter|Senf'],
  ['Käsetoast', 2, '4 Scheiben Toast|4 Scheiben Käse|20 g Butter|Ketchup'],
  ['Toast Hawaii', 2, '4 Scheiben Toast|4 Scheiben Kochschinken|4 Scheiben Ananas|4 Scheiben Käse|Butter'],
  ['Club-Sandwich', 2, '6 Scheiben Toast|200 g Hähnchenbrust|4 Scheiben Bacon|1 Tomate|Salat|Mayonnaise|2 Eier'],
  ['Bruschetta', 4, '1 Baguette|4 Tomaten|2 Knoblauchzehen|Basilikum|Olivenöl|Salz'],
  ['Tomate-Mozzarella', 2, '3 Tomaten|250 g Mozzarella|Basilikum|Olivenöl|Balsamico|Baguette'],
  ['Hummus mit Gemüsesticks', 2, '1 Dose Kichererbsen|2 EL Tahin|1 Zitrone|1 Knoblauchzehe|Olivenöl|2 Karotten|1 Gurke|1 Paprika'],
  ['Guacamole mit Nachos', 4, '3 Avocados|1 Tomate|1 Zwiebel|1 Limette|Koriander|200 g Nachos'],
  ['Tzatziki', 4, '500 g griechischer Joghurt|1 Gurke|2 Knoblauchzehen|Olivenöl|Dill|Fladenbrot'],
  ['Pellkartoffeln mit Kräuterquark', 2, '600 g Kartoffeln|500 g Quark|100 ml Milch|Schnittlauch|Petersilie|Leinöl'],
  ['Ofenkartoffel mit Sour Cream', 2, '4 große Kartoffeln|200 g Schmand|Schnittlauch|100 g Speckwürfel|Butter'],
  ['Kartoffel-Wedges mit Dip', 2, '800 g Kartoffeln|Olivenöl|Paprikapulver|200 g Schmand|Schnittlauch'],
  ['Süßkartoffel-Pommes', 2, '2 Süßkartoffeln|Olivenöl|Paprikapulver|1 EL Speisestärke|Mayonnaise'],
  ['Pizzabrötchen', 4, '6 Brötchen|200 g Kochschinken|200 g geriebener Käse|200 g Schmand|1 Paprika|Oregano'],
  ['Blätterteigtaschen', 4, '1 Rolle Blätterteig|150 g Feta|200 g Spinat|1 Ei|Sesam'],
  ['Quesadillas', 2, '4 Tortillas|200 g geriebener Käse|1 Dose Mais|1 Paprika|200 g Hähnchenbrust|Salsa'],
  ['Hot Dogs', 4, '4 Hot-Dog-Brötchen|4 Wiener Würstchen|Röstzwiebeln|Gewürzgurken|Ketchup|Senf'],
  ['Chicken Nuggets', 2, '400 g Hähnchenbrust|2 Eier|Mehl|Paniermehl|Öl|Ketchup'],
  ['Currywurst mit Pommes', 2, '4 Bratwürste|750 g Pommes|300 ml Ketchup|Currypulver|1 Zwiebel'],
  ['Leberkäse mit Spiegelei', 2, '4 Scheiben Leberkäse|4 Eier|Senf|600 g Kartoffeln|Butter'],
  ['Maultaschen in der Brühe', 2, '1 Packung Maultaschen|750 ml Gemüsebrühe|Schnittlauch|1 Zwiebel'],
  ['Senfeier', 2, '6 Eier|600 g Kartoffeln|30 g Butter|30 g Mehl|400 ml Milch|3 EL Senf'],
  ['Spinat mit Ei und Kartoffeln', 2, '450 g Rahmspinat|4 Eier|600 g Kartoffeln|Butter|Muskat'],
  ['Gurkensalat', 4, '2 Gurken|200 g Joghurt|Dill|1 Zwiebel|Essig|Zucker'],
  ['Tomatensalat', 4, '6 Tomaten|1 Zwiebel|Olivenöl|Balsamico|Basilikum|Salz'],
  ['Krautsalat', 6, '1 Weißkohl|1 Zwiebel|Essig|Öl|Zucker|Kümmel'],
  ['Eiersalat', 4, '6 Eier|3 EL Mayonnaise|100 g Joghurt|Schnittlauch|Senf|Brot'],
  ['Thunfischsalat', 2, '2 Dosen Thunfisch|1 Dose Mais|1 Zwiebel|Salat|2 Eier|Olivenöl|1 Zitrone'],
  ['Wurstsalat', 4, '400 g Fleischwurst|200 g Emmentaler|1 Zwiebel|Gewürzgurken|Essig|Öl|Brot'],
  ['Couscous-Salat', 4, '250 g Couscous|1 Gurke|3 Tomaten|1 Paprika|Petersilie|1 Zitrone|Olivenöl|200 g Feta'],
  ['Quinoa-Bowl', 2, '150 g Quinoa|1 Avocado|1 Dose Kichererbsen|1 Paprika|100 g Spinat|1 Zitrone|Olivenöl'],
  ['Burrito-Bowl', 2, '200 g Reis|1 Dose Kidneybohnen|1 Dose Mais|1 Avocado|300 g Hähnchenbrust|Salsa|Schmand|1 Limette'],
  ['Sushi-Bowl', 2, '200 g Sushireis|200 g Lachs|1 Avocado|1 Gurke|Sojasauce|Sesam|Reisessig'],
  ['Hühnersuppe', 4, '1 Suppenhuhn|3 Karotten|1 Stange Lauch|1 Stück Sellerie|1 Zwiebel|200 g Suppennudeln|Petersilie'],
  ['Gemüsesuppe', 4, '3 Karotten|3 Kartoffeln|1 Stange Lauch|1 Zucchini|1 Zwiebel|1 l Gemüsebrühe|Petersilie'],
  ['Brokkolicremesuppe', 4, '1 Brokkoli|2 Kartoffeln|1 Zwiebel|750 ml Gemüsebrühe|200 ml Sahne|Muskat'],
  ['Erbsensuppe', 4, '500 g Erbsen|3 Kartoffeln|2 Karotten|1 Zwiebel|1 l Gemüsebrühe|4 Wiener Würstchen'],
  ['Zwiebelsuppe', 4, '800 g Zwiebeln|50 g Butter|1 l Rinderbrühe|100 ml Weißwein|Baguette|150 g geriebener Käse'],
  ['Minestrone', 4, '2 Karotten|2 Kartoffeln|1 Zucchini|1 Dose weiße Bohnen|400 g gehackte Tomaten|100 g Suppennudeln|1 l Gemüsebrühe|Parmesan'],
  ['Schnelle Ramen', 2, '2 Packungen Ramen-Nudeln|750 ml Gemüsebrühe|2 Eier|2 Frühlingszwiebeln|100 g Champignons|Sojasauce|Ingwer'],
  ['Spaghetti Aglio e Olio', 2, '250 g Spaghetti|4 Knoblauchzehen|6 EL Olivenöl|Chiliflocken|Petersilie|Parmesan'],
  ['Penne Arrabbiata', 2, '250 g Penne|400 g gehackte Tomaten|2 Knoblauchzehen|1 Chilischote|Olivenöl|Parmesan'],
  ['Nudeln mit Tomatensauce', 2, '250 g Nudeln|400 g passierte Tomaten|1 Zwiebel|1 Knoblauchzehe|Basilikum|Parmesan'],
  ['Mac and Cheese', 4, '400 g Makkaroni|300 g Cheddar|500 ml Milch|40 g Butter|40 g Mehl|Paniermehl'],
  ['Tortellini in Sahnesauce', 2, '500 g Tortellini|200 ml Sahne|150 g Kochschinken|100 g Erbsen|Parmesan'],
  ['Gnocchi mit Tomatensauce', 2, '500 g Gnocchi|400 g gehackte Tomaten|125 g Mozzarella|1 Knoblauchzehe|Basilikum'],
  ['Lachs-Sahne-Nudeln', 2, '250 g Tagliatelle|200 g Räucherlachs|200 ml Sahne|1 Zwiebel|1 Zitrone|Dill'],
  ['Feta-Pasta aus dem Ofen', 2, '250 g Nudeln|200 g Feta|400 g Cherrytomaten|2 Knoblauchzehen|Olivenöl|Basilikum'],
  ['One-Pot-Pasta', 4, '400 g Nudeln|400 g gehackte Tomaten|1 Zwiebel|2 Knoblauchzehen|100 g Spinat|800 ml Gemüsebrühe|Parmesan'],
  ['Garnelen-Pasta', 2, '250 g Linguine|250 g Garnelen|2 Knoblauchzehen|200 g Cherrytomaten|Olivenöl|1 Zitrone|Petersilie'],
  ['Gebratene Nudeln', 2, '250 g Mie-Nudeln|2 Karotten|1 Paprika|100 g Sojasprossen|2 Eier|Sojasauce|2 Frühlingszwiebeln'],
  ['Teriyaki-Hähnchen', 2, '400 g Hähnchenbrust|100 ml Teriyaki-Sauce|200 g Reis|1 Brokkoli|Sesam'],
  ['Pad Thai', 2, '200 g Reisnudeln|200 g Hähnchenbrust|2 Eier|100 g Sojasprossen|2 Frühlingszwiebeln|Erdnüsse|1 Limette|Sojasauce'],
  ['Hähnchen süß-sauer', 2, '400 g Hähnchenbrust|1 Paprika|1 Dose Ananas|2 Karotten|Süß-Sauer-Sauce|200 g Reis'],
  ['Königsberger Klopse', 4, '500 g Hackfleisch|1 Brötchen|1 Ei|1 Zwiebel|750 ml Fleischbrühe|40 g Butter|40 g Mehl|200 ml Sahne|Kapern|Kartoffeln'],
  ['Hühnerfrikassee', 4, '600 g Hähnchenbrust|250 g Champignons|200 g Erbsen|2 Karotten|40 g Butter|40 g Mehl|500 ml Hühnerbrühe|100 ml Sahne|300 g Reis'],
  ['Geschnetzeltes', 4, '600 g Schweinegeschnetzeltes|250 g Champignons|1 Zwiebel|200 ml Sahne|200 ml Brühe|Spätzle'],
  ['Hackpfanne mit Reis', 4, '500 g Hackfleisch|250 g Reis|2 Paprika|1 Zwiebel|400 g gehackte Tomaten|Paprikapulver'],
  ['Gefüllte Paprika', 4, '4 Paprika|400 g Hackfleisch|100 g Reis|1 Zwiebel|400 g passierte Tomaten|150 g geriebener Käse'],
  ['Kohlrouladen', 4, '1 Weißkohl|500 g Hackfleisch|1 Zwiebel|1 Ei|1 Brötchen|500 ml Fleischbrühe|Kartoffeln'],
  ['Rouladen', 4, '4 Rinderrouladen|4 Scheiben Bacon|2 Zwiebeln|Gewürzgurken|Senf|500 ml Rinderbrühe|Rotkohl|Kartoffelklöße'],
  ['Fischfilet mit Reis', 2, '2 Fischfilets|200 g Reis|1 Zitrone|20 g Butter|300 g Brokkoli'],
  ['Quiche Lorraine', 4, '1 Rolle Mürbeteig|200 g Speckwürfel|200 g Schmand|3 Eier|150 g geriebener Käse|Muskat'],
  ['Gemüsequiche', 4, '1 Rolle Mürbeteig|1 Brokkoli|1 Paprika|200 g Schmand|3 Eier|150 g geriebener Käse'],
  ['Zwiebelkuchen', 6, '400 g Mehl|1 Würfel Hefe|1 kg Zwiebeln|200 g Speckwürfel|200 g Schmand|3 Eier|Kümmel'],
  ['Falafel-Wrap', 2, '8 Falafel|2 Tortillas|Salat|1 Tomate|1 Gurke|150 g Joghurt|Hummus'],
  ['Kaiserschmarrn', 2, '4 Eier|200 g Mehl|300 ml Milch|30 g Zucker|40 g Butter|Rosinen|Puderzucker|Apfelmus'],
  ['Milchreis', 4, '250 g Milchreis|1 l Milch|40 g Zucker|Vanillezucker|Zimt|Kirschen'],
  ['Grießbrei', 2, '500 ml Milch|60 g Grieß|20 g Zucker|Vanillezucker|Zimt|Apfelmus'],
  ['Crêpes', 4, '250 g Mehl|500 ml Milch|3 Eier|30 g Butter|Nutella|Zucker'],
  ['Apfelpfannkuchen', 2, '150 g Mehl|250 ml Milch|2 Eier|2 Äpfel|Butter|Zimt|Zucker'],
  ['Obstsalat', 4, '2 Äpfel|2 Bananen|2 Orangen|200 g Trauben|200 g Erdbeeren|1 Zitrone|Honig'],
  ['Quarkspeise', 4, '500 g Quark|200 ml Sahne|40 g Zucker|Vanillezucker|300 g Beeren'],
  ['Tiramisu', 6, '500 g Mascarpone|200 g Löffelbiskuits|4 Eier|80 g Zucker|300 ml Kaffee|Kakao'],
  ['Schokomuffins', 12, '250 g Mehl|150 g Zucker|100 g Butter|2 Eier|200 ml Milch|30 g Kakao|1 Päckchen Backpulver|100 g Schokolade'],
  ['Apfelkuchen', 12, '4 Äpfel|250 g Mehl|150 g Zucker|150 g Butter|3 Eier|1 Päckchen Backpulver|Zimt'],
  ['Käsekuchen', 12, '1 kg Quark|200 g Zucker|4 Eier|1 Päckchen Vanillepudding|200 g Mehl|100 g Butter|1 Zitrone'],
  ['Brownies', 12, '200 g Schokolade|150 g Butter|200 g Zucker|3 Eier|120 g Mehl|30 g Kakao|Walnüsse'],
  ['Cookies', 20, '250 g Mehl|150 g Butter|150 g Zucker|1 Ei|200 g Schokolade|1 TL Backpulver|Vanillezucker'],
  ['Smoothie', 2, '2 Bananen|200 g Beeren|300 ml Milch|150 g Joghurt|Honig'],
  ['Bananen-Milchshake', 2, '2 Bananen|400 ml Milch|2 Kugeln Vanilleeis|Honig'],
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

// Suche nach bewerteten Rezepten auf einer Rezeptseite (zum Aussuchen und Einfügen des Links)
export const searchUrl = name => `https://www.chefkoch.de/rs/s0/${encodeURIComponent(String(name || '').trim().toLowerCase().replace(/\s+/g, ' '))}/Rezepte.html`;
