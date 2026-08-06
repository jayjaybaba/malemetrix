# NUTRITION_ENGINE — Bausteinsystem statt 84-Tage-Speiseplan

Stand: Phase 3. Code: `js/simple/plan-engine.js` (`computeTargets`,
`buildNutrition`, `MEAL_BLOCKS`, `FOODS`, `shoppingList`).
Tests: `tools-dev/tests/simple-engine.test.js`.

## Ziele (deterministisch, identische Formeln wie die Transformation)

- Mifflin-St-Jeor-Grundumsatz × Aktivitätsfaktor = Erhaltungsbedarf.
- Rate: 80 % der seriösen Maximalrate × Score-Faktor (Regeneration/Energie/
  Warnsignale → konservativer), hart gedeckelt bei 1 % KG/Woche (Cut) bzw.
  +150–500 kcal (Aufbau). **Untergrenze 1500 kcal, immer.**
- Protein: 2,0–2,2 g/kg Zielgewicht, abgesichert im Korridor 1,6–2,6 g/kg
  Startgewicht. Fett-Minimum ~0,8 g/kg.
- Getrennte Ziele: Gesamtziel (ehrliche Gesamtdauer) vs. Woche-12-Korridor.

## Mahlzeitenbausteine

Je Slot (Frühstück/Mittag/Abend/Snack) mehrere Optionen mit Lebensmitteln,
Grammmengen, kcal, Protein, einfacher Zubereitung und Tags
(`veggie`, `quick` ≤10 min, `nocook`). Filter: Ernährungsform, Ausschlüsse/
Allergien (strikt), Kochzeit. Portionen skalieren deterministisch auf den
Slot-Anteil des Kalorienziels (Faktor 0,6–1,6, auf 5 g gerundet);
Mahlzeitenanzahl 2–5 bestimmt den Split (z. B. 3 Mahlzeiten: 30/40/30).

Kein 84-Tage-Speiseplan: dieselben Bausteine wiederholen sich — das ist
Absicht (einkaufbar, kochbar, messbar). Austausch pro Slot jederzeit;
die Einkaufsliste folgt automatisch.

## Praktische Regeln (sichtbar im Plan)

Restaurant · Wochenende · Familienessen · Zeitmangel · Urlaub · keine
Kochmöglichkeit · hoher Hunger · verpasste Mahlzeit · spontane Einladung —
jeweils eine kurze, umsetzbare Regel (DE/EN). Keine medizinische
Ernährungstherapie; bei Warnsignalen plant die Engine konservativ und der
Plan trägt den Hinweis auf ärztliche Abklärung.

## Einkaufsliste (§14)

`shoppingList(nutrition, {pantry})`:
- Mengen für 7 Tage aus der tatsächlich gewählten Bausteinkombination,
- identische Lebensmittel zusammengefasst (ein Eintrag je Lebensmittel),
- Kategorien: Gemüse & Obst · Proteinquellen · Milchprodukte ·
  Kohlenhydrate · Tiefkühl · Gewürze & Sonstiges,
- Personenanzahl multipliziert, Vorräte (`pantry`) werden weggelassen,
- Auswärts-Tage reduzieren Hauptmahlzeit-Mengen,
- auf 25 g gerundet; `shoppingListText()` liefert sauberen Klartext für
  Kopieren / Web Share / Notizen.

Abhaken passiert in der App (Phase 4); ein Mahlzeitentausch erzeugt die
Liste neu (getestet).
