import SwiftUI

/// "Kalorien": Tagesbudget aus dem echten Verbrauch (Apple Health) minus
/// Ziel-Defizit, dagegen die erfassten Mahlzeiten. Der Dinner-Planer-Gedanke
/// der Website — nur mit echten Verbrauchsdaten statt Schätzformel.
struct EnergyView: View {
    @EnvironmentObject var health: HealthKitManager
    @EnvironmentObject var meals: MealStore

    @AppStorage("mm_deficit") private var deficit = 400
    @AppStorage("mm_write_health") private var writeToHealth = true
    @State private var showAdd = false

    /// Budget-Grundlage: Ø-Verbrauch der letzten 7 vollen Tage (aus Health).
    /// Fallback, solange die Baseline fehlt: 2400 kcal.
    private var tdee: Double {
        health.baseline.tdee > 0 ? health.baseline.tdee : 2400
    }
    private var target: Int { max(Int(tdee) - deficit, 1200) }
    private var remaining: Int { target - meals.todayKcal }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    budgetCard
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets())
                }

                Section("Heute gegessen") {
                    if meals.todayMeals.isEmpty {
                        Text("Noch nichts erfasst. Tipp auf +, um deine erste Mahlzeit einzutragen.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    ForEach(meals.todayMeals) { meal in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(meal.name)
                                Text("\(meal.protein) g Protein")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text("\(meal.kcal) kcal")
                                .font(.subheadline.weight(.semibold))
                        }
                    }
                    .onDelete { offsets in
                        let items = offsets.map { meals.todayMeals[$0] }
                        items.forEach { meals.remove($0) }
                    }
                }

                Section("Einstellungen") {
                    Stepper("Ziel-Defizit: \(deficit) kcal", value: $deficit, in: 0...800, step: 50)
                    Toggle("Mahlzeiten in Apple Health speichern", isOn: $writeToHealth)
                    LabeledContent("Ø Verbrauch (7 Tage)",
                                   value: health.baseline.tdee > 0
                                   ? "\(Int(health.baseline.tdee)) kcal"
                                   : "noch keine Daten")
                }
            }
            .navigationTitle("Kalorien")
            .toolbar {
                Button { showAdd = true } label: { Image(systemName: "plus.circle.fill") }
            }
            .sheet(isPresented: $showAdd) {
                AddMealSheet { meal in
                    meals.add(meal)
                    if writeToHealth {
                        Task { await health.logMealToHealth(meal) }
                    }
                }
                .presentationDetents([.medium])
            }
            .refreshable { await health.refresh() }
        }
    }

    private var budgetCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("DEIN TAGES-BUDGET")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(remaining)")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundStyle(remaining >= 0 ? Theme.green : Theme.red)
                Text("kcal übrig")
                    .foregroundStyle(.secondary)
            }
            ProgressView(value: min(Double(meals.todayKcal), Double(target)), total: Double(target))
                .tint(remaining >= 0 ? Theme.accent : Theme.red)
            HStack {
                Text("Ziel: \(target) kcal")
                Spacer()
                Text("Gegessen: \(meals.todayKcal) kcal · \(meals.todayProtein) g Protein")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            Text("Budget = dein echter Ø-Verbrauch aus Apple Health (\(Int(tdee)) kcal) minus \(deficit) kcal Defizit.")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(18)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18))
    }
}

struct AddMealSheet: View {
    var onSave: (Meal) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var kcal = ""
    @State private var protein = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Was hast du gegessen?", text: $name)
                TextField("Kalorien (kcal)", text: $kcal)
                    .keyboardType(.numberPad)
                TextField("Protein (g)", text: $protein)
                    .keyboardType(.numberPad)
            }
            .navigationTitle("Mahlzeit erfassen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Speichern") {
                        let meal = Meal(name: name.isEmpty ? "Mahlzeit" : name,
                                        kcal: Int(kcal) ?? 0,
                                        protein: Int(protein) ?? 0)
                        onSave(meal)
                        dismiss()
                    }
                    .disabled(Int(kcal) == nil)
                }
            }
        }
    }
}
