/* ==========================================================================
   MaleMetrix — Lebensmittel-Datenbank für den Kalorien-Tracker
   --------------------------------------------------------------------------
   Jeder Eintrag:
     n    = Name
     cat  = Kategorie (für Filter/Anzeige)
     t    = Portionstyp: "g" (Werte pro 100 g) oder "stk" (Werte pro Stück/Portion)
     base = Standard-Menge (g bei "g", Anzahl bei "stk")
     unit = Anzeigeeinheit bei "stk" (z. B. "Stück", "Scheibe", "Portion")
     kcal, p, c, f = Kalorien, Protein, Kohlenhydrate, Fett — bezogen auf
                     100 g ("g") bzw. auf 1 Stück/Einheit ("stk")
   Werte sind Alltags-Richtwerte (gerundet), keine amtliche Nährwerttabelle.
   Frei erweiterbar — einfach Zeilen ergänzen.
   ========================================================================== */
(function () {
  "use strict";
  // Kurzschreibweise: [n, cat, t, base, unit, kcal, p, c, f]
  var rows = [
    // --- Fleisch & Geflügel (pro 100 g) ---
    ["Hähnchenbrust (gegart)", "Fleisch", "g", 150, "", 165, 31, 0, 3.6],
    ["Hähnchenschenkel", "Fleisch", "g", 150, "", 210, 26, 0, 11],
    ["Putenbrust", "Fleisch", "g", 150, "", 135, 30, 0, 1],
    ["Rinderhackfleisch (roh)", "Fleisch", "g", 150, "", 250, 19, 0, 19],
    ["Rindersteak (mager)", "Fleisch", "g", 200, "", 215, 27, 0, 12],
    ["Schweinefilet", "Fleisch", "g", 150, "", 145, 22, 0, 6],
    ["Hackfleisch gemischt", "Fleisch", "g", 150, "", 230, 18, 0, 18],
    ["Bacon (gebraten)", "Fleisch", "g", 30, "", 540, 37, 1, 42],
    ["Salami", "Fleisch", "g", 30, "", 380, 22, 1, 32],
    ["Kochschinken", "Fleisch", "g", 30, "", 110, 20, 1, 3],
    ["Bratwurst", "Fleisch", "stk", 1, "Stück", 290, 12, 1, 26],
    ["Wiener Würstchen", "Fleisch", "stk", 1, "Paar", 230, 10, 1, 21],

    // --- Fisch (pro 100 g) ---
    ["Lachs", "Fisch", "g", 150, "", 208, 20, 0, 13],
    ["Thunfisch (Wasser, Dose)", "Fisch", "g", 100, "", 110, 25, 0, 1],
    ["Thunfisch (Öl, abgetropft)", "Fisch", "g", 100, "", 190, 26, 0, 9],
    ["Kabeljau/Dorsch", "Fisch", "g", 150, "", 82, 18, 0, 0.7],
    ["Forelle", "Fisch", "g", 150, "", 120, 20, 0, 4],
    ["Garnelen", "Fisch", "g", 100, "", 99, 24, 0, 0.3],
    ["Hering", "Fisch", "g", 100, "", 210, 18, 0, 15],

    // --- Eier & Milchprodukte ---
    ["Ei (M)", "Eier & Milch", "stk", 1, "Stück", 78, 6.3, 0.6, 5.3],
    ["Eiweiß (1 Ei)", "Eier & Milch", "stk", 1, "Stück", 17, 3.6, 0.2, 0.1],
    ["Magerquark", "Eier & Milch", "g", 250, "", 67, 12, 4, 0.3],
    ["Speisequark 20%", "Eier & Milch", "g", 250, "", 110, 12, 3, 5],
    ["Skyr", "Eier & Milch", "g", 150, "", 63, 11, 4, 0.2],
    ["Griechischer Joghurt 10%", "Eier & Milch", "g", 150, "", 115, 6, 4, 9],
    ["Naturjoghurt 3,5%", "Eier & Milch", "g", 150, "", 61, 3.5, 5, 3.5],
    ["Hüttenkäse (körnig)", "Eier & Milch", "g", 100, "", 98, 13, 3, 4],
    ["Milch 1,5%", "Eier & Milch", "g", 200, "", 47, 3.4, 5, 1.5],
    ["Milch 3,5%", "Eier & Milch", "g", 200, "", 64, 3.3, 5, 3.5],
    ["Gouda 48%", "Eier & Milch", "g", 30, "", 356, 25, 0, 28],
    ["Mozzarella", "Eier & Milch", "g", 50, "", 250, 18, 1, 20],
    ["Feta", "Eier & Milch", "g", 50, "", 264, 14, 1, 21],
    ["Parmesan", "Eier & Milch", "g", 20, "", 400, 36, 0, 28],
    ["Frischkäse", "Eier & Milch", "g", 30, "", 250, 6, 3, 24],
    ["Butter", "Eier & Milch", "g", 10, "", 740, 0.7, 0.6, 82],

    // --- Kohlenhydrate / Beilagen (pro 100 g gegart, außer anders) ---
    ["Reis (gekocht)", "Beilagen", "g", 150, "", 130, 2.7, 28, 0.3],
    ["Basmatireis (gekocht)", "Beilagen", "g", 150, "", 135, 3, 29, 0.4],
    ["Nudeln (gekocht)", "Beilagen", "g", 150, "", 158, 6, 31, 1],
    ["Vollkornnudeln (gekocht)", "Beilagen", "g", 150, "", 150, 6, 27, 1.5],
    ["Kartoffeln (gekocht)", "Beilagen", "g", 200, "", 87, 2, 20, 0.1],
    ["Süßkartoffel (gebacken)", "Beilagen", "g", 150, "", 90, 2, 21, 0.1],
    ["Pommes frites", "Beilagen", "g", 150, "", 290, 3.4, 38, 14],
    ["Couscous (gekocht)", "Beilagen", "g", 150, "", 112, 3.8, 23, 0.2],
    ["Quinoa (gekocht)", "Beilagen", "g", 150, "", 120, 4.4, 21, 1.9],
    ["Haferflocken", "Beilagen", "g", 60, "", 372, 13, 59, 7],
    ["Vollkornbrot", "Beilagen", "stk", 1, "Scheibe", 100, 4, 18, 1],
    ["Toastbrot", "Beilagen", "stk", 1, "Scheibe", 75, 2.5, 14, 1],
    ["Brötchen", "Beilagen", "stk", 1, "Stück", 140, 5, 27, 1.5],
    ["Vollkornbrötchen", "Beilagen", "stk", 1, "Stück", 150, 6, 26, 2],

    // --- Gemüse (pro 100 g) ---
    ["Brokkoli", "Gemüse", "g", 150, "", 34, 2.8, 7, 0.4],
    ["Blumenkohl", "Gemüse", "g", 150, "", 25, 1.9, 5, 0.3],
    ["Zucchini", "Gemüse", "g", 150, "", 17, 1.2, 3, 0.3],
    ["Paprika", "Gemüse", "g", 100, "", 31, 1, 6, 0.3],
    ["Tomaten", "Gemüse", "g", 100, "", 18, 0.9, 4, 0.2],
    ["Gurke", "Gemüse", "g", 100, "", 12, 0.6, 2, 0.1],
    ["Karotten", "Gemüse", "g", 100, "", 41, 0.9, 10, 0.2],
    ["Spinat", "Gemüse", "g", 100, "", 23, 2.9, 4, 0.4],
    ["Champignons", "Gemüse", "g", 100, "", 22, 3, 3, 0.3],
    ["Blattsalat (gemischt)", "Gemüse", "g", 100, "", 15, 1.4, 2, 0.2],
    ["Avocado", "Gemüse", "stk", 0.5, "halbe", 160, 2, 9, 15],
    ["Zwiebel", "Gemüse", "g", 50, "", 40, 1.1, 9, 0.1],
    ["Mais (Dose)", "Gemüse", "g", 100, "", 90, 3, 19, 1.2],
    ["Kidneybohnen (Dose)", "Gemüse", "g", 100, "", 100, 7, 15, 0.5],
    ["Kichererbsen (gekocht)", "Gemüse", "g", 100, "", 130, 8, 20, 2],
    ["Linsen (gekocht)", "Gemüse", "g", 100, "", 116, 9, 20, 0.4],

    // --- Obst ---
    ["Banane", "Obst", "stk", 1, "Stück", 105, 1.3, 27, 0.3],
    ["Apfel", "Obst", "stk", 1, "Stück", 95, 0.5, 25, 0.3],
    ["Orange", "Obst", "stk", 1, "Stück", 62, 1.2, 15, 0.2],
    ["Beeren (gemischt)", "Obst", "g", 100, "", 50, 1, 11, 0.4],
    ["Heidelbeeren", "Obst", "g", 100, "", 57, 0.7, 14, 0.3],
    ["Erdbeeren", "Obst", "g", 100, "", 32, 0.7, 8, 0.3],
    ["Trauben", "Obst", "g", 100, "", 69, 0.7, 18, 0.2],
    ["Mango", "Obst", "g", 100, "", 60, 0.8, 15, 0.4],
    ["Ananas", "Obst", "g", 100, "", 50, 0.5, 13, 0.1],

    // --- Nüsse, Fette, Aufstriche ---
    ["Mandeln", "Nüsse & Fette", "g", 30, "", 579, 21, 22, 50],
    ["Walnüsse", "Nüsse & Fette", "g", 30, "", 654, 15, 14, 65],
    ["Erdnussbutter", "Nüsse & Fette", "g", 20, "", 588, 25, 20, 50],
    ["Olivenöl", "Nüsse & Fette", "g", 10, "", 884, 0, 0, 100],
    ["Rapsöl", "Nüsse & Fette", "g", 10, "", 884, 0, 0, 100],
    ["Honig", "Nüsse & Fette", "g", 20, "", 304, 0.3, 82, 0],
    ["Marmelade", "Nüsse & Fette", "g", 20, "", 250, 0.5, 60, 0],
    ["Nuss-Nougat-Creme", "Nüsse & Fette", "g", 20, "", 539, 6, 57, 31],

    // --- Snacks & Süßes ---
    ["Proteinriegel", "Snacks", "stk", 1, "Riegel", 200, 20, 20, 6],
    ["Müsliriegel", "Snacks", "stk", 1, "Riegel", 120, 2, 20, 4],
    ["Schokolade (Vollmilch)", "Snacks", "g", 30, "", 535, 8, 57, 30],
    ["Zartbitterschokolade", "Snacks", "g", 30, "", 546, 7, 46, 36],
    ["Chips", "Snacks", "g", 50, "", 536, 6, 53, 33],
    ["Salzstangen", "Snacks", "g", 50, "", 380, 10, 78, 3],
    ["Gummibärchen", "Snacks", "g", 50, "", 340, 7, 77, 0.1],
    ["Kekse", "Snacks", "g", 30, "", 480, 6, 65, 21],
    ["Eiscreme (Vanille)", "Snacks", "g", 100, "", 200, 3.5, 24, 11],
    ["Popcorn (gesalzen)", "Snacks", "g", 30, "", 480, 8, 60, 22],

    // --- Getränke ---
    ["Cola", "Getränke", "g", 330, "", 42, 0, 11, 0],
    ["Cola Zero", "Getränke", "g", 330, "", 0.3, 0, 0, 0],
    ["Orangensaft", "Getränke", "g", 200, "", 45, 0.7, 10, 0.2],
    ["Apfelschorle", "Getränke", "g", 300, "", 24, 0, 6, 0],
    ["Bier (Pils)", "Getränke", "g", 500, "", 42, 0.5, 3, 0],
    ["Weißbier", "Getränke", "g", 500, "", 45, 0.5, 4, 0],
    ["Rotwein", "Getränke", "g", 150, "", 85, 0.1, 3, 0],
    ["Weißwein", "Getränke", "g", 150, "", 82, 0.1, 3, 0],
    ["Latte Macchiato", "Getränke", "stk", 1, "Glas", 120, 6, 10, 6],
    ["Cappuccino", "Getränke", "stk", 1, "Tasse", 75, 4, 6, 4],
    ["Kaffee schwarz", "Getränke", "stk", 1, "Tasse", 2, 0.1, 0, 0],
    ["Proteinshake (Wasser)", "Getränke", "stk", 1, "Portion", 120, 25, 3, 1.5],
    ["Whey-Protein (Pulver)", "Getränke", "g", 30, "", 380, 78, 8, 6],

    // --- Fertig- & Restaurantgerichte (pro Portion) ---
    ["Pizza Margherita (ganz)", "Restaurant", "stk", 0.5, "halbe", 850, 34, 100, 30],
    ["Pizza Salami (ganz)", "Restaurant", "stk", 0.5, "halbe", 980, 40, 100, 44],
    ["Döner", "Restaurant", "stk", 1, "Stück", 700, 40, 60, 33],
    ["Dürüm", "Restaurant", "stk", 1, "Stück", 780, 42, 70, 35],
    ["Burger (Cheeseburger)", "Restaurant", "stk", 1, "Stück", 500, 25, 40, 26],
    ["Big-Menü mit Pommes", "Restaurant", "stk", 1, "Menü", 1100, 40, 110, 50],
    ["Sushi (8 Stück)", "Restaurant", "stk", 1, "Portion", 350, 14, 60, 5],
    ["Poke Bowl (Lachs)", "Restaurant", "stk", 1, "Bowl", 550, 34, 60, 18],
    ["Pad Thai (Hähnchen)", "Restaurant", "stk", 1, "Portion", 600, 30, 70, 20],
    ["Chicken Tikka Masala + Reis", "Restaurant", "stk", 1, "Portion", 720, 40, 65, 30],
    ["Caesar Salad mit Hähnchen", "Restaurant", "stk", 1, "Portion", 480, 40, 15, 28],
    ["Gyros-Teller mit Tzatziki", "Restaurant", "stk", 1, "Portion", 680, 50, 20, 45],
    ["Currywurst mit Pommes", "Restaurant", "stk", 1, "Portion", 850, 25, 70, 52],
    ["Schnitzel mit Pommes", "Restaurant", "stk", 1, "Portion", 900, 45, 75, 45],
    ["Burrito Bowl", "Restaurant", "stk", 1, "Bowl", 600, 35, 65, 22],
    ["Salatbowl mit Feta", "Restaurant", "stk", 1, "Bowl", 380, 15, 25, 24]
  ];

  window.MM_FOODDB = rows.map(function (r) {
    return { n: r[0], cat: r[1], t: r[2], base: r[3], unit: r[4], kcal: r[5], p: r[6], c: r[7], f: r[8] };
  });
})();
